/** Saved-view types shared between the filter engine, the rail UI, and the Supabase service. */

export type DashboardKind = 'advisor' | 'manager';

export type FilterField =
  // Demographics
  | 'age' | 'income'
  // FIRE
  | 'fireOnTrack' | 'fireGap'
  // Insurance
  | 'deathGap' | 'ciGap' | 'eciGap' | 'tpdGap' | 'signalScore'
  | 'hasIsp' | 'hasRider'
  // Activity
  | 'daysSinceMeeting' | 'daysUntilReview' | 'hasOpenTask' | 'hasNotes'
  // Manager-only
  | 'advisor';

export type FilterOp =
  | 'between' | 'gt' | 'lt' | 'eq'
  | 'is' | 'isNot'                           // booleans
  | 'olderThan' | 'within' | 'overdue';      // date helpers

export type FilterValue = number | string | boolean | [number, number];

export interface FilterChip {
  id: string;
  field: FilterField;
  op: FilterOp;
  value: FilterValue;
}

export type ColumnSet = 'advisor' | 'fire' | 'insurance';

export interface ViewConfig {
  filters: FilterChip[];
  sortBy: string;
  sortDir: 'asc' | 'desc';
  columnSet: ColumnSet;
}

export interface SavedView {
  id: string;
  ownerId: string;
  orgId: string | null;
  scope: 'personal' | 'team';
  name: string;
  dashboardKind: DashboardKind;
  config: ViewConfig;
  createdAt: string;
  updatedAt: string;
}

/** A view bundled at runtime — either from DB or the hardcoded built-ins list. */
export interface ResolvedView {
  id: string;                    // 'builtin:advisor.shortfall' for built-ins, or DB UUID
  name: string;
  origin: 'builtin' | 'personal' | 'team';
  dashboardKind: DashboardKind;
  config: ViewConfig;
  /** True for built-ins; UI must surface "Save as new view" instead of "Save changes". */
  readonly: boolean;
}
