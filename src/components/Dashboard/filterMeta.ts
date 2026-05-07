import { FilterField, FilterOp, FilterChip } from '../../savedViewsTypes';

/** Metadata about each filter field used to drive the AddFilterMenu + chip label. */
export interface FilterFieldMeta {
  field: FilterField;
  group: 'Demographics' | 'FIRE' | 'Insurance' | 'Activity' | 'Team';
  label: string;
  /** Allowed operators for this field. */
  ops: FilterOp[];
  /** Value editor for the operators. */
  valueKind: 'numberRange' | 'numberSingle' | 'boolean' | 'days' | 'overdue' | 'string';
  /** Default operator + value when first added via the menu. */
  defaultChip: () => Omit<FilterChip, 'id'>;
  /** Render a short value summary inside the chip pill. */
  renderValue: (chip: FilterChip) => string;
  /** Manager-only fields are hidden in the AdvisorDashboard menu. */
  managerOnly?: boolean;
}

const BOOL_LABEL = (v: any) => (v === true ? 'Yes' : v === false ? 'No' : '—');

function fmtRange(v: any): string {
  if (Array.isArray(v) && v.length === 2) return `${v[0]}–${v[1]}`;
  return String(v);
}

function fmtCurrency(v: any): string {
  if (Array.isArray(v) && v.length === 2) {
    return `S$${kFmt(v[0])}–S$${kFmt(v[1])}`;
  }
  return `S$${kFmt(v)}`;
}

function kFmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

export const FILTER_FIELDS: FilterFieldMeta[] = [
  // Demographics
  {
    field: 'age', group: 'Demographics', label: 'Age',
    ops: ['between', 'gt', 'lt'], valueKind: 'numberRange',
    defaultChip: () => ({ field: 'age', op: 'between', value: [40, 60] }),
    renderValue: (c) => c.op === 'between' ? `${fmtRange(c.value)}` : c.op === 'gt' ? `> ${c.value}` : `< ${c.value}`,
  },
  {
    field: 'income', group: 'Demographics', label: 'Annual income',
    ops: ['between', 'gt', 'lt'], valueKind: 'numberRange',
    defaultChip: () => ({ field: 'income', op: 'gt', value: 100000 }),
    renderValue: (c) => c.op === 'between' ? fmtCurrency(c.value) : c.op === 'gt' ? `> ${fmtCurrency(c.value)}` : `< ${fmtCurrency(c.value)}`,
  },

  // FIRE
  {
    field: 'fireOnTrack', group: 'FIRE', label: 'On-track for FIRE',
    ops: ['is', 'isNot'], valueKind: 'boolean',
    defaultChip: () => ({ field: 'fireOnTrack', op: 'is', value: true }),
    renderValue: (c) => `${c.op === 'is' ? '' : 'not '}${BOOL_LABEL(c.value)}`,
  },
  {
    field: 'fireGap', group: 'FIRE', label: 'FIRE shortfall (S$)',
    ops: ['gt', 'lt', 'between'], valueKind: 'numberRange',
    defaultChip: () => ({ field: 'fireGap', op: 'gt', value: 100000 }),
    renderValue: (c) => c.op === 'between' ? fmtCurrency(c.value) : c.op === 'gt' ? `> ${fmtCurrency(c.value)}` : `< ${fmtCurrency(c.value)}`,
  },

  // Insurance
  {
    field: 'deathGap', group: 'Insurance', label: 'Death gap',
    ops: ['gt', 'lt', 'between'], valueKind: 'numberRange',
    defaultChip: () => ({ field: 'deathGap', op: 'gt', value: 0 }),
    renderValue: (c) => c.op === 'gt' && c.value === 0 ? 'has gap' : c.op === 'gt' ? `> ${fmtCurrency(c.value)}` : c.op === 'lt' ? `< ${fmtCurrency(c.value)}` : fmtCurrency(c.value),
  },
  {
    field: 'ciGap', group: 'Insurance', label: 'CI gap',
    ops: ['gt', 'lt', 'between'], valueKind: 'numberRange',
    defaultChip: () => ({ field: 'ciGap', op: 'gt', value: 0 }),
    renderValue: (c) => c.op === 'gt' && c.value === 0 ? 'has gap' : c.op === 'gt' ? `> ${fmtCurrency(c.value)}` : c.op === 'lt' ? `< ${fmtCurrency(c.value)}` : fmtCurrency(c.value),
  },
  {
    field: 'eciGap', group: 'Insurance', label: 'ECI gap',
    ops: ['gt', 'lt', 'between'], valueKind: 'numberRange',
    defaultChip: () => ({ field: 'eciGap', op: 'gt', value: 0 }),
    renderValue: (c) => c.op === 'gt' && c.value === 0 ? 'has gap' : c.op === 'gt' ? `> ${fmtCurrency(c.value)}` : c.op === 'lt' ? `< ${fmtCurrency(c.value)}` : fmtCurrency(c.value),
  },
  {
    field: 'tpdGap', group: 'Insurance', label: 'TPD gap',
    ops: ['gt', 'lt', 'between'], valueKind: 'numberRange',
    defaultChip: () => ({ field: 'tpdGap', op: 'gt', value: 0 }),
    renderValue: (c) => c.op === 'gt' && c.value === 0 ? 'has gap' : c.op === 'gt' ? `> ${fmtCurrency(c.value)}` : c.op === 'lt' ? `< ${fmtCurrency(c.value)}` : fmtCurrency(c.value),
  },
  {
    field: 'signalScore', group: 'Insurance', label: 'Signal score',
    ops: ['gt', 'lt', 'between'], valueKind: 'numberRange',
    defaultChip: () => ({ field: 'signalScore', op: 'gt', value: 60 }),
    renderValue: (c) => c.op === 'between' ? fmtRange(c.value) : c.op === 'gt' ? `> ${c.value}` : `< ${c.value}`,
  },
  {
    field: 'hasIsp', group: 'Insurance', label: 'Has ISP',
    ops: ['is', 'isNot'], valueKind: 'boolean',
    defaultChip: () => ({ field: 'hasIsp', op: 'is', value: false }),
    renderValue: (c) => `${c.op === 'is' ? '' : 'not '}${BOOL_LABEL(c.value)}`,
  },
  {
    field: 'hasRider', group: 'Insurance', label: 'Has rider',
    ops: ['is', 'isNot'], valueKind: 'boolean',
    defaultChip: () => ({ field: 'hasRider', op: 'is', value: false }),
    renderValue: (c) => `${c.op === 'is' ? '' : 'not '}${BOOL_LABEL(c.value)}`,
  },

  // Activity
  {
    field: 'daysSinceMeeting', group: 'Activity', label: 'Days since last meeting',
    ops: ['olderThan', 'within'], valueKind: 'days',
    defaultChip: () => ({ field: 'daysSinceMeeting', op: 'olderThan', value: 90 }),
    renderValue: (c) => c.op === 'olderThan' ? `> ${c.value}d ago` : `≤ ${c.value}d ago`,
  },
  {
    field: 'daysUntilReview', group: 'Activity', label: 'Next review',
    ops: ['overdue', 'within'], valueKind: 'overdue',
    defaultChip: () => ({ field: 'daysUntilReview', op: 'overdue', value: 0 }),
    renderValue: (c) => c.op === 'overdue' ? 'overdue' : `due in ≤ ${c.value}d`,
  },
  {
    field: 'hasOpenTask', group: 'Activity', label: 'Has open task',
    ops: ['is', 'isNot'], valueKind: 'boolean',
    defaultChip: () => ({ field: 'hasOpenTask', op: 'is', value: true }),
    renderValue: (c) => `${c.op === 'is' ? '' : 'not '}${BOOL_LABEL(c.value)}`,
  },
  {
    field: 'hasNotes', group: 'Activity', label: 'Has notes',
    ops: ['is', 'isNot'], valueKind: 'boolean',
    defaultChip: () => ({ field: 'hasNotes', op: 'is', value: true }),
    renderValue: (c) => `${c.op === 'is' ? '' : 'not '}${BOOL_LABEL(c.value)}`,
  },
  {
    field: 'nextPremiumDueDays', group: 'Activity', label: 'Next premium due',
    ops: ['within', 'overdue'], valueKind: 'overdue',
    defaultChip: () => ({ field: 'nextPremiumDueDays', op: 'within', value: 30 }),
    renderValue: (c) => c.op === 'overdue' ? 'overdue' : `due in ≤ ${c.value}d`,
  },
];

export function metaFor(field: FilterField): FilterFieldMeta | undefined {
  return FILTER_FIELDS.find(m => m.field === field);
}

export function chipLabel(chip: FilterChip): string {
  const meta = metaFor(chip.field);
  if (!meta) return `${chip.field} ${chip.op}`;
  return `${meta.label}: ${meta.renderValue(chip)}`;
}
