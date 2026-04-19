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
  const { data: membership, error: mErr } = await supabase
    .from('team_memberships')
    .select('org_id, role')
    .eq('status', 'active')
    .single();

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

/** Check for a pending invite matching the caller's email and activate it. */
export async function acceptPendingInvite(): Promise<boolean> {
  const { data, error } = await supabase.rpc('accept_pending_invite');
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
