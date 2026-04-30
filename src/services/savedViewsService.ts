import { supabase } from './supabaseClient';
import { DashboardKind, SavedView, ViewConfig } from '../savedViewsTypes';

function rowToView(row: any): SavedView {
  return {
    id: row.id,
    ownerId: row.owner_id,
    orgId: row.org_id ?? null,
    scope: row.scope,
    name: row.name,
    dashboardKind: row.dashboard_kind,
    config: row.config ?? { filters: [], sortBy: 'name', sortDir: 'asc', columnSet: 'advisor' },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Returns own personal views + all team views in caller's org (RLS-enforced). */
export async function listSavedViews(): Promise<SavedView[]> {
  const { data, error } = await supabase
    .from('saved_views')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToView);
}

export async function createSavedView(params: {
  name: string;
  dashboardKind: DashboardKind;
  config: ViewConfig;
  scope: 'personal' | 'team';
  /** Required when scope === 'team'; ignored for personal. */
  orgId?: string | null;
}): Promise<SavedView> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const insertRow: Record<string, any> = {
    owner_id: user.id,
    name: params.name,
    dashboard_kind: params.dashboardKind,
    config: params.config,
    scope: params.scope,
  };
  if (params.scope === 'team') {
    if (!params.orgId) throw new Error('orgId required for team-scoped views');
    insertRow.org_id = params.orgId;
  }

  const { data, error } = await supabase
    .from('saved_views')
    .insert(insertRow)
    .select()
    .single();
  if (error) throw error;
  return rowToView(data);
}

export async function updateSavedView(
  id: string,
  updates: Partial<Pick<SavedView, 'name' | 'config'>>,
): Promise<void> {
  const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.config !== undefined) dbUpdates.config = updates.config;
  const { error } = await supabase.from('saved_views').update(dbUpdates).eq('id', id);
  if (error) throw error;
}

export async function deleteSavedView(id: string): Promise<void> {
  const { error } = await supabase.from('saved_views').delete().eq('id', id);
  if (error) throw error;
}
