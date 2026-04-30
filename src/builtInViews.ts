import { ResolvedView, FilterChip } from './savedViewsTypes';

function chip(field: FilterChip['field'], op: FilterChip['op'], value: FilterChip['value']): FilterChip {
  return { id: `${field}.${op}.${Math.random().toString(36).slice(2, 6)}`, field, op, value };
}

/** Built-in views are merged into the rail at runtime. Read-only by definition. */
export const BUILT_IN_VIEWS: ResolvedView[] = [
  // ── Advisor dashboard built-ins ─────────────────────────────────────────────
  {
    id: 'builtin:advisor.all',
    name: 'All clients',
    origin: 'builtin',
    dashboardKind: 'advisor',
    config: { filters: [], sortBy: 'name', sortDir: 'asc', columnSet: 'advisor' },
    readonly: true,
  },
  {
    id: 'builtin:advisor.onTrack',
    name: '✓ On track',
    origin: 'builtin',
    dashboardKind: 'advisor',
    config: {
      filters: [chip('fireOnTrack', 'is', true)],
      sortBy: 'wealth', sortDir: 'desc', columnSet: 'advisor',
    },
    readonly: true,
  },
  {
    id: 'builtin:advisor.shortfall',
    name: '⚠ Shortfall',
    origin: 'builtin',
    dashboardKind: 'advisor',
    config: {
      filters: [chip('fireOnTrack', 'is', false)],
      sortBy: 'wealth', sortDir: 'asc', columnSet: 'advisor',
    },
    readonly: true,
  },
  {
    id: 'builtin:advisor.hasGaps',
    name: 'Has insurance gaps',
    origin: 'builtin',
    dashboardKind: 'advisor',
    config: {
      filters: [chip('deathGap', 'gt', 0)],
      sortBy: 'name', sortDir: 'asc', columnSet: 'advisor',
    },
    readonly: true,
  },
  {
    id: 'builtin:advisor.needsFollowup',
    name: '📅 Needs follow-up',
    origin: 'builtin',
    dashboardKind: 'advisor',
    config: {
      // "Stale > 365d OR never met" — encoded as olderThan 365 (the engine treats null as satisfying this)
      filters: [chip('daysSinceMeeting', 'olderThan', 365)],
      sortBy: 'name', sortDir: 'asc', columnSet: 'advisor',
    },
    readonly: true,
  },
  // ── Manager dashboard built-ins ─────────────────────────────────────────────
  {
    id: 'builtin:manager.allFire',
    name: 'All — FIRE view',
    origin: 'builtin',
    dashboardKind: 'manager',
    config: { filters: [], sortBy: 'signalScore', sortDir: 'desc', columnSet: 'fire' },
    readonly: true,
  },
  {
    id: 'builtin:manager.allInsurance',
    name: 'All — Insurance view',
    origin: 'builtin',
    dashboardKind: 'manager',
    config: { filters: [], sortBy: 'signalScore', sortDir: 'desc', columnSet: 'insurance' },
    readonly: true,
  },
  {
    id: 'builtin:manager.shortfall',
    name: '⚠ Shortfall',
    origin: 'builtin',
    dashboardKind: 'manager',
    config: {
      filters: [chip('fireOnTrack', 'is', false)],
      sortBy: 'fireGap', sortDir: 'desc', columnSet: 'fire',
    },
    readonly: true,
  },
  {
    id: 'builtin:manager.onTrack',
    name: '✓ On track',
    origin: 'builtin',
    dashboardKind: 'manager',
    config: {
      filters: [chip('fireOnTrack', 'is', true)],
      sortBy: 'wealth', sortDir: 'desc', columnSet: 'fire',
    },
    readonly: true,
  },
  {
    id: 'builtin:manager.highSignal',
    name: '🔥 High signal',
    origin: 'builtin',
    dashboardKind: 'manager',
    config: {
      filters: [chip('signalScore', 'gt', 60)],
      sortBy: 'signalScore', sortDir: 'desc', columnSet: 'insurance',
    },
    readonly: true,
  },
];

export function builtInsForKind(kind: 'advisor' | 'manager'): ResolvedView[] {
  return BUILT_IN_VIEWS.filter(v => v.dashboardKind === kind);
}
