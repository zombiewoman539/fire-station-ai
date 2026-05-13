import React from 'react';
import { useTeam } from '../../contexts/TeamContext';
import { supabase } from '../../services/supabaseClient';
import { ClientProfile } from '../../profileTypes';
import { Task } from '../../services/taskService';
import { EnrichedProfile, enrichProfile } from '../../enrichProfile';
import { applyFilters, applySearch, compareRows } from '../../filterEngine';
import {
  DashboardKind, ResolvedView, FilterChip, ViewConfig, SavedView,
} from '../../savedViewsTypes';
import { builtInsForKind } from '../../builtInViews';
import { useToast } from '../../contexts/ToastContext';
import {
  listSavedViews, createSavedView, updateSavedView, deleteSavedView,
} from '../../services/savedViewsService';
import SavedViewsRail from './SavedViewsRail';
import FilterBar from './FilterBar';
import ClientTable from './ClientTable';
import SaveViewModal from './SaveViewModal';
import ColumnPicker from './ColumnPicker';

interface Props {
  dashboardKind: DashboardKind;
  profiles: ClientProfile[];
  tasks: Task[];
  /** Called when the user clicks a row's "+ Task" button (manager dashboard). */
  onRowTaskClick?: (profile: ClientProfile) => void;
}

const STORAGE_KEY_PREFIX = 'dashboard';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function storageKey(kind: DashboardKind, key: 'activeViewId' | 'draftFilters' | 'draftVisibleColumns' | 'search'): string {
  return `${STORAGE_KEY_PREFIX}.${kind}.${key}`;
}

function setDraftStorage(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify({ v: value, exp: Date.now() + DRAFT_TTL_MS })); } catch {}
}

function getDraftStorage<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'exp' in parsed) {
      if (Date.now() > parsed.exp) { localStorage.removeItem(key); return null; }
      return parsed.v as T;
    }
    return parsed as T; // legacy format without TTL — valid until next write
  } catch { localStorage.removeItem(key); return null; }
}

function sweepExpiredDrafts(): void {
  const now = Date.now();
  Object.keys(localStorage)
    .filter(k => k.startsWith(STORAGE_KEY_PREFIX + '.'))
    .forEach(key => {
      try {
        const parsed = JSON.parse(localStorage.getItem(key) ?? '');
        if (parsed?.exp && now > parsed.exp) localStorage.removeItem(key);
      } catch {}
    });
}

function savedViewToResolved(v: SavedView): ResolvedView {
  return {
    id: v.id,
    name: v.name,
    origin: v.scope === 'team' ? 'team' : 'personal',
    dashboardKind: v.dashboardKind,
    config: v.config,
    readonly: false,
  };
}

const DEFAULT_CONFIG_FOR_KIND: Record<DashboardKind, ViewConfig> = {
  advisor: { filters: [], sortBy: 'name', sortDir: 'asc', columnSet: 'advisor' },
  manager: { filters: [], sortBy: 'signalScore', sortDir: 'desc', columnSet: 'fire' },
};

export default function DashboardShell({ dashboardKind, profiles, tasks, onRowTaskClick }: Props) {
  const { teamStatus } = useTeam();
  const { showError } = useToast();
  const isManager = teamStatus?.role === 'manager';
  const orgId = teamStatus?.orgId ?? null;

  // Sweep expired draft filters once on mount
  React.useEffect(() => { sweepExpiredDrafts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Current user id — used by ClientTable to mark rows the manager owns.
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setCurrentUserId(user.id);
    });
  }, []);

  // ─── View state ─────────────────────────────────────────────────────────────
  const [savedViews, setSavedViews] = React.useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = React.useState<string>(() => {
    return localStorage.getItem(storageKey(dashboardKind, 'activeViewId'))
      || (dashboardKind === 'advisor' ? 'builtin:advisor.all' : 'builtin:manager.allFire');
  });
  const [draftFilters, setDraftFilters] = React.useState<FilterChip[] | null>(() =>
    getDraftStorage<FilterChip[]>(storageKey(dashboardKind, 'draftFilters'))
  );
  // null = no draft (use the active view's columns); undefined = user explicitly reset to all.
  const [draftVisibleColumns, setDraftVisibleColumns] = React.useState<string[] | undefined | null>(() => {
    const val = getDraftStorage<string[] | string>(storageKey(dashboardKind, 'draftVisibleColumns'));
    if (val === null) return null;
    if (val === '__all__') return undefined;
    return Array.isArray(val) ? val : null;
  });
  const [search, setSearch] = React.useState<string>(() => localStorage.getItem(storageKey(dashboardKind, 'search')) ?? '');
  const [showSaveModal, setShowSaveModal] = React.useState<'as-new' | 'rename' | null>(null);

  React.useEffect(() => {
    localStorage.setItem(storageKey(dashboardKind, 'activeViewId'), activeViewId);
  }, [activeViewId, dashboardKind]);
  React.useEffect(() => {
    const key = storageKey(dashboardKind, 'draftFilters');
    if (draftFilters === null) localStorage.removeItem(key);
    else setDraftStorage(key, draftFilters);
  }, [draftFilters, dashboardKind]);
  React.useEffect(() => {
    const key = storageKey(dashboardKind, 'draftVisibleColumns');
    if (draftVisibleColumns === null) localStorage.removeItem(key);
    else setDraftStorage(key, draftVisibleColumns === undefined ? '__all__' : draftVisibleColumns);
  }, [draftVisibleColumns, dashboardKind]);
  React.useEffect(() => { localStorage.setItem(storageKey(dashboardKind, 'search'), search); }, [search, dashboardKind]);

  // Load saved views once on mount
  const refreshViews = React.useCallback(async () => {
    try {
      const views = await listSavedViews();
      setSavedViews(views.filter(v => v.dashboardKind === dashboardKind));
    } catch (e) {
      console.error('Load saved views failed:', e);
      showError('Could not load saved views — your filters may be reset.');
    }
  }, [dashboardKind, showError]);
  React.useEffect(() => { refreshViews(); }, [refreshViews]);

  // ─── Resolve active view ────────────────────────────────────────────────────
  const builtIns = React.useMemo(() => builtInsForKind(dashboardKind), [dashboardKind]);
  const personalViews = React.useMemo(
    () => savedViews.filter(v => v.scope === 'personal').map(savedViewToResolved),
    [savedViews],
  );
  const teamViews = React.useMemo(
    () => savedViews.filter(v => v.scope === 'team').map(savedViewToResolved),
    [savedViews],
  );

  const allViews: ResolvedView[] = React.useMemo(
    () => [...builtIns, ...personalViews, ...teamViews],
    [builtIns, personalViews, teamViews],
  );

  const activeView = React.useMemo(
    () => allViews.find(v => v.id === activeViewId) ?? builtIns[0],
    [allViews, activeViewId, builtIns],
  );

  // Effective config: drafts (chips, visibleColumns) override the active view when set
  const effectiveConfig: ViewConfig = React.useMemo(() => {
    if (!activeView) return DEFAULT_CONFIG_FOR_KIND[dashboardKind];
    let cfg: ViewConfig = activeView.config;
    if (draftFilters !== null) cfg = { ...cfg, filters: draftFilters };
    if (draftVisibleColumns !== null) cfg = { ...cfg, visibleColumns: draftVisibleColumns };
    return cfg;
  }, [activeView, draftFilters, draftVisibleColumns, dashboardKind]);

  const isModified = draftFilters !== null || draftVisibleColumns !== null;

  // ─── Compute rows ──────────────────────────────────────────────────────────
  // Cache keyed by profile.id + updatedAt + that profile's task snapshot.
  // Avoids re-running FIRE math on profiles whose data hasn't changed.
  const enrichCache = React.useRef<Record<string, EnrichedProfile>>({});

  const enriched = React.useMemo(() => {
    return profiles.map(profile => {
      const ownTasksSig = tasks
        .filter(t => t.clientProfileId === profile.id)
        .map(t => `${t.id}:${t.status}`)
        .join(',');
      const cacheKey = `${profile.id}:${profile.updatedAt}:${ownTasksSig}`;
      if (!enrichCache.current[cacheKey]) {
        enrichCache.current[cacheKey] = enrichProfile(profile, { tasks });
      }
      return enrichCache.current[cacheKey];
    });
  }, [profiles, tasks]);

  // Tag suggestions = union of tags across all loaded profiles
  const tagSuggestions = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of profiles) for (const t of p.tags ?? []) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [profiles]);

  const rowsForActiveView = React.useMemo(() => {
    let rows = applyFilters(enriched, effectiveConfig.filters);
    rows = applySearch(rows, search);
    rows = [...rows].sort((a, b) => compareRows(a, b, effectiveConfig.sortBy, effectiveConfig.sortDir));
    return rows;
  }, [enriched, effectiveConfig, search]);

  // Counts per view (does not include search box)
  const counts: Record<string, number> = React.useMemo(() => {
    const out: Record<string, number> = {};
    for (const v of allViews) {
      out[v.id] = applyFilters(enriched, v.config.filters).length;
    }
    return out;
  }, [enriched, allViews]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectView = (viewId: string) => {
    setActiveViewId(viewId);
    setDraftFilters(null);
    setDraftVisibleColumns(null);
  };

  const handleChipsChange = (chips: FilterChip[]) => {
    setDraftFilters(chips);
  };

  const handleSortChange = (sortBy: string, sortDir: 'asc' | 'desc') => {
    // Sort changes go to the active view's config (or are applied to draft)
    if (!activeView) return;
    if (activeView.readonly) {
      // Built-ins: derive a draft of the current chips + new sort by treating it as if user modified
      // For simplicity we mutate the active view in memory only; not persisted.
      // (User must Save as new view to persist sort changes on a built-in.)
    }
    // Update activeView config locally — for non-built-ins we'll save when user clicks Save changes
    if (!activeView.readonly) {
      const updated = { ...activeView.config, sortBy, sortDir };
      setSavedViews(prev => prev.map(v =>
        v.id === activeView.id ? { ...v, config: updated } : v,
      ));
      // Persist to DB silently
      updateSavedView(activeView.id, { config: updated }).catch(err => console.error('Sort save failed', err));
    } else {
      // Built-in: keep as a session-only draft sort by stuffing into draftFilters trick — actually simpler:
      // we don't expose persistent sort changes on built-ins. The user needs to Save as new view to keep sort.
      // For UX clarity, we still re-render with the new sort by mutating built-in config in-place.
      activeView.config.sortBy = sortBy;
      activeView.config.sortDir = sortDir;
      // Force re-render
      setActiveViewId(activeViewId);
    }
  };

  const handleSaveAsNew = async (name: string, scope: 'personal' | 'team') => {
    if (!activeView) return;
    const config = effectiveConfig;
    const newView = await createSavedView({
      name,
      dashboardKind,
      config,
      scope,
      orgId: scope === 'team' ? orgId : null,
    });
    await refreshViews();
    setActiveViewId(newView.id);
    setDraftVisibleColumns(null);
    setDraftFilters(null);
    setShowSaveModal(null);
  };

  const handleSaveChanges = async () => {
    if (!activeView || activeView.readonly) return;
    await updateSavedView(activeView.id, { config: effectiveConfig });
    await refreshViews();
    setDraftFilters(null);
    setDraftVisibleColumns(null);
  };

  const handleDelete = async (view: ResolvedView) => {
    if (!window.confirm(`Delete "${view.name}"?`)) return;
    await deleteSavedView(view.id);
    if (activeViewId === view.id) {
      setActiveViewId(builtIns[0]?.id ?? '');
      setDraftFilters(null);
      setDraftVisibleColumns(null);
    }
    await refreshViews();
  };

  const handleNewView = () => setShowSaveModal('as-new');

  const handleRowTaskClick = onRowTaskClick
    ? (row: EnrichedProfile) => onRowTaskClick(row.profile)
    : undefined;

  // ─── Render ────────────────────────────────────────────────────────────────
  const actions = (
    <div style={{ display: 'flex', gap: 6, marginLeft: 6, alignItems: 'center' }}>
      <ColumnPicker
        columnSet={effectiveConfig.columnSet}
        visibleColumns={effectiveConfig.visibleColumns}
        onChange={(next) => setDraftVisibleColumns(next === undefined ? undefined : next)}
      />
      {activeView && !activeView.readonly && isModified && (
        <button
          type="button"
          onClick={handleSaveChanges}
          style={{
            padding: '5px 12px', borderRadius: 7, border: 'none',
            background: '#10b981', color: '#fff',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Save changes
        </button>
      )}
      {activeView && (activeView.readonly || isModified) && (
        <button
          type="button"
          onClick={() => setShowSaveModal('as-new')}
          style={{
            padding: '5px 12px', borderRadius: 7,
            border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Save as new view
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
      <SavedViewsRail
        views={{ builtIn: builtIns, personal: personalViews, team: teamViews }}
        counts={counts}
        activeViewId={activeViewId}
        onSelect={handleSelectView}
        onNewView={handleNewView}
        onDelete={handleDelete}
      />

      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 8 }}>
          <h2 style={{
            margin: 0, fontSize: 18, fontWeight: 700,
            color: 'var(--text-1)', letterSpacing: '-0.01em',
          }}>
            {activeView?.name ?? 'Clients'}
            {isModified && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-4)', fontWeight: 400 }}>· modified</span>}
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
            {rowsForActiveView.length} {rowsForActiveView.length === 1 ? 'client' : 'clients'}
          </p>
        </div>

        <FilterBar
          dashboardKind={dashboardKind}
          chips={effectiveConfig.filters}
          onChipsChange={handleChipsChange}
          search={search}
          onSearchChange={setSearch}
          actions={actions}
          tagSuggestions={tagSuggestions}
        />

        <ClientTable
          rows={rowsForActiveView}
          columnSet={effectiveConfig.columnSet}
          sortBy={effectiveConfig.sortBy}
          sortDir={effectiveConfig.sortDir}
          onSortChange={handleSortChange}
          visibleColumns={effectiveConfig.visibleColumns}
          onTaskClick={handleRowTaskClick}
          currentUserId={currentUserId}
        />
      </main>

      {showSaveModal && (
        <SaveViewModal
          isManager={isManager}
          defaultScope={isManager ? 'personal' : 'personal'}
          onClose={() => setShowSaveModal(null)}
          onSave={handleSaveAsNew}
        />
      )}
    </div>
  );
}
