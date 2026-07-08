import { DashboardKind, SavedView, ViewConfig } from '../savedViewsTypes';

const BASE = '';

function rowToView(row: any): SavedView {
  return {
    id: row.id,
    ownerId: row.owner_id ?? 'local',
    orgId: row.org_id ?? null,
    scope: row.scope,
    name: row.name,
    dashboardKind: row.dashboard_kind,
    config: row.config ?? { filters: [], sortBy: 'name', sortDir: 'asc', columnSet: 'advisor' },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res;
}

export async function listSavedViews(): Promise<SavedView[]> {
  const res = await apiFetch('/api/saved-views');
  const rows = await res.json();
  return (rows as any[]).map(rowToView);
}

export async function createSavedView(params: {
  name: string;
  dashboardKind: DashboardKind;
  config: ViewConfig;
  scope: 'personal' | 'team';
  orgId?: string | null;
}): Promise<SavedView> {
  const res = await apiFetch('/api/saved-views', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: params.name,
      dashboardKind: params.dashboardKind,
      config: params.config,
      scope: 'personal',
    }),
  });
  return rowToView(await res.json());
}

export async function updateSavedView(
  id: string,
  updates: Partial<Pick<SavedView, 'name' | 'config'>>,
): Promise<void> {
  await apiFetch(`/api/saved-views/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function deleteSavedView(id: string): Promise<void> {
  await apiFetch(`/api/saved-views/${id}`, { method: 'DELETE' });
}
