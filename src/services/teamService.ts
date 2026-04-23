import { supabase } from './supabaseClient';

export interface OrgMember {
  id: string;
  userId: string | null;
  email: string;
  role: 'manager' | 'advisor';
  status: 'active' | 'pending';
  createdAt: string;
}

export interface TeamStatus {
  orgId: string;
  orgName: string;
  role: 'manager' | 'advisor';
}

export interface AdvisorSummary extends OrgMember {
  clientCount: number;
  lastActive: string | null; // ISO date of most recently updated profile
}

/** Returns the current user's team status, or null if they're solo. */
export async function getMyTeamStatus(): Promise<TeamStatus | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships, error: mErr } = await supabase
    .from('team_memberships')
    .select('org_id, role')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .limit(1);

  const membership = memberships?.[0] ?? null;

  if (mErr || !membership) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', membership.org_id)
    .single();

  return {
    orgId: membership.org_id,
    orgName: org?.name ?? 'My Team',
    role: membership.role as 'manager' | 'advisor',
  };
}

/** Create a new organization and make the current user its manager. */
export async function createOrganization(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_organization', { org_name: name });
  if (error) throw error;
  return data as string;
}

/** Invite an advisor by email (manager only). */
export async function inviteAdvisor(email: string): Promise<void> {
  const { error } = await supabase.rpc('invite_advisor', { p_email: email });
  if (error) throw error;
}

export interface PendingInvite {
  orgId: string;
  orgName: string;
}

/** Returns the pending invite for the current user, or null if none exists. */
export async function getPendingInvite(): Promise<PendingInvite | null> {
  const { data, error } = await supabase.rpc('get_pending_invite');
  if (error || !data || data.length === 0) return null;
  return { orgId: data[0].org_id, orgName: data[0].org_name };
}

/** Accept the pending invite — activates membership. */
export async function acceptPendingInvite(): Promise<boolean> {
  const { data, error } = await supabase.rpc('accept_pending_invite');
  if (error) return false;
  return data as boolean;
}

/** Decline the pending invite — deletes the membership row. */
export async function declinePendingInvite(): Promise<boolean> {
  const { data, error } = await supabase.rpc('reject_pending_invite');
  if (error) return false;
  return data as boolean;
}

/** Get all members in the current user's org (manager only). */
export async function getOrgMembers(): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from('team_memberships')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/** Get all profiles in the org, grouped into per-advisor summaries (manager only). */
export async function getAdvisorSummaries(): Promise<AdvisorSummary[]> {
  const [membersResult, profilesResult] = await Promise.all([
    supabase.from('team_memberships').select('*').order('created_at', { ascending: true }),
    supabase
      .from('client_profiles')
      .select('user_id, updated_at')
      .is('deleted_at', null),
  ]);

  const members: OrgMember[] = (membersResult.data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  }));

  const profiles = profilesResult.data || [];

  // Group profiles by user_id
  const profilesByUser: Record<string, { count: number; lastActive: string | null }> = {};
  for (const p of profiles) {
    const uid = p.user_id as string;
    if (!profilesByUser[uid]) profilesByUser[uid] = { count: 0, lastActive: null };
    profilesByUser[uid].count++;
    if (!profilesByUser[uid].lastActive || p.updated_at > profilesByUser[uid].lastActive!) {
      profilesByUser[uid].lastActive = p.updated_at;
    }
  }

  return members.map(m => ({
    ...m,
    clientCount: m.userId ? (profilesByUser[m.userId]?.count ?? 0) : 0,
    lastActive: m.userId ? (profilesByUser[m.userId]?.lastActive ?? null) : null,
  }));
}

/** Get all profiles belonging to a specific advisor (manager drill-down). */
export async function getAdvisorProfiles(advisorUserId: string) {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('id, name, updated_at, meta, inputs')
    .eq('user_id', advisorUserId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/** Remove an advisor from the org (manager only — soft: deletes the membership). */
export async function removeMember(membershipId: string): Promise<void> {
  const { error } = await supabase
    .from('team_memberships')
    .delete()
    .eq('id', membershipId);
  if (error) throw error;
}

/** Leave the current user's team (removes their own membership row). */
export async function leaveTeam(): Promise<void> {
  const { error } = await supabase.rpc('leave_team');
  if (error) throw error;
}

/** Dissolve the entire organization (manager only). Detaches all client profiles, then deletes the org. */
export async function dissolveOrganization(): Promise<void> {
  const { error } = await supabase.rpc('dissolve_organization');
  if (error) throw error;
}

/** Transfer a client profile from one advisor to another (manager only). */
export async function transferClient(profileId: string, toUserId: string): Promise<void> {
  const { error } = await supabase.rpc('transfer_client', {
    p_profile_id: profileId,
    p_to_user_id: toUserId,
  });
  if (error) throw error;
}

export interface TeamProfile {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  advisorUserId: string;
  advisorEmail: string;
  meta: any;
  inputs: any;
}

export interface AdvisorTarget {
  advisorUserId: string;
  month: string; // 'YYYY-MM'
  targetNewClients: number;
}

/** Get all non-deleted client profiles across the whole team (manager only). */
export async function getAllTeamProfiles(): Promise<TeamProfile[]> {
  const [membersResult, profilesResult] = await Promise.all([
    supabase.from('team_memberships').select('user_id, email').eq('status', 'active'),
    supabase
      .from('client_profiles')
      .select('id, name, updated_at, created_at, user_id, meta, inputs')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
  ]);

  const emailByUserId: Record<string, string> = {};
  for (const m of membersResult.data ?? []) {
    if (m.user_id) emailByUserId[m.user_id] = m.email;
  }

  return (profilesResult.data ?? []).map(p => ({
    id: p.id,
    name: p.name,
    updatedAt: p.updated_at,
    createdAt: p.created_at,
    advisorUserId: p.user_id,
    advisorEmail: emailByUserId[p.user_id] ?? '',
    meta: p.meta,
    inputs: p.inputs,
  }));
}

/** Get all monthly targets for the current org (manager only). */
export async function getAdvisorTargets(month: string): Promise<AdvisorTarget[]> {
  const { data, error } = await supabase
    .from('advisor_targets')
    .select('advisor_user_id, month, target_new_clients')
    .eq('month', month);

  if (error || !data) return [];
  return data.map(row => ({
    advisorUserId: row.advisor_user_id,
    month: row.month,
    targetNewClients: row.target_new_clients,
  }));
}

/** Set (upsert) a monthly new-client target for an advisor (manager only). */
export async function setAdvisorTarget(advisorUserId: string, month: string, targetNewClients: number): Promise<void> {
  const { data: mem } = await supabase
    .from('team_memberships')
    .select('org_id')
    .eq('status', 'active')
    .limit(1);

  const orgId = mem?.[0]?.org_id;
  if (!orgId) throw new Error('No active team');

  const { error } = await supabase
    .from('advisor_targets')
    .upsert(
      { org_id: orgId, advisor_user_id: advisorUserId, month, target_new_clients: targetNewClients, updated_at: new Date().toISOString() },
      { onConflict: 'org_id,advisor_user_id,month' }
    );

  if (error) throw error;
}
