import { supabase } from './supabaseClient';
import { ClientProfile, NoteEntry } from '../profileTypes';
import { FireInputs, InsurancePolicy, Nominee } from '../types';
import { defaultInputs } from '../defaults';

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseNoteEntries(meta: any, fallbackTimestamp: string): NoteEntry[] {
  if (Array.isArray(meta?.noteEntries)) {
    return meta.noteEntries
      .filter((e: any) => e && typeof e.body === 'string')
      .map((e: any) => ({
        id: typeof e.id === 'string' ? e.id : newId(),
        createdAt: typeof e.createdAt === 'string' ? e.createdAt : fallbackTimestamp,
        updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : undefined,
        body: e.body,
        meetingDate: typeof e.meetingDate === 'string' ? e.meetingDate : undefined,
      }));
  }
  // Legacy: a single notes string becomes one entry
  if (typeof meta?.notes === 'string' && meta.notes.trim().length > 0) {
    return [{
      id: newId(),
      createdAt: fallbackTimestamp,
      body: meta.notes,
    }];
  }
  return [];
}

// Migrate old profiles to new schema
function migrateInputs(inputs: any): FireInputs {
  const assets = inputs.assets || {};
  const inc = inputs.income || {};
  return {
    ...inputs,
    income: {
      annualIncome:                  inc.annualIncome ?? 72000,
      annualExpenses:                inc.annualExpenses ?? 36000,
      expenseItems:                  inc.expenseItems ?? [],
      annualInvestmentContribution:  inc.annualInvestmentContribution ?? 12000,
      salaryGrowthRate:              inc.salaryGrowthRate ?? 3,
      retirementExpenses:            inc.retirementExpenses ?? 48000,
      inflationRate:                 inc.inflationRate ?? 2.5,
      withdrawalRate:                inc.withdrawalRate ?? 3.5,
    },
    assets: {
      cashSavings:                assets.cashSavings ?? 0,
      investments:                assets.investments ?? 0,
      cashReturnRate:             assets.cashReturnRate ?? 1,
      investmentReturnRate:       assets.investmentReturnRate ?? 7,
      investmentBuckets:          assets.investmentBuckets ?? [],
      retirementReturnReduction:  assets.retirementReturnReduction ?? 30,
    },
    policies: (inputs.policies || []).map((p: any): InsurancePolicy => ({
      ...p,
      policyType: p.policyType ?? 'whole-life',
      deathSumAssured: p.deathSumAssured ?? 0,
      tpdSumAssured: p.tpdSumAssured ?? 0,
      eciSumAssured: p.eciSumAssured ?? 0,
      ciSumAssured: p.ciSumAssured ?? 0,
      premiumAmount: p.premiumAmount ?? 0,
      premiumFrequency: p.premiumFrequency ?? 'monthly',
      premiumNextDueDate: p.premiumNextDueDate ?? null,
      premiumPaymentTerm: p.premiumPaymentTerm ?? 'limited',
      premiumLimitedYears: p.premiumLimitedYears ?? 0,
      nominees: p.nominees
        ? (p.nominees as Nominee[])
        : p.nomineeName
          ? [{ name: p.nomineeName as string, percentage: 100, clientId: (p.nomineeClientId ?? null) as string | null }]
          : [],
      insurer: p.insurer ?? '',
      policyNumber: p.policyNumber ?? '',
      policyStatus: p.policyStatus ?? 'in-force',
      commencementDate: p.commencementDate ?? null,
      maturityDate: p.maturityDate ?? null,
      fundAllocations: p.fundAllocations ?? [],
    })),
    estatePlanning: {
      lpa: inputs.estatePlanning?.lpa ?? false,
      lpaDonee1: inputs.estatePlanning?.lpaDonee1 ?? '',
      lpaDonee2: inputs.estatePlanning?.lpaDonee2 ?? '',
      lpaReplacementDonee: inputs.estatePlanning?.lpaReplacementDonee ?? '',
      will: inputs.estatePlanning?.will ?? false,
    },
    hospitalPlan: inputs.hospitalPlan ?? defaultInputs.hospitalPlan,
  };
}

function parseMeta(
  meta: any,
  fallbackTimestamp: string,
): Pick<ClientProfile, 'lastMeetingDate' | 'nextReviewDate' | 'notes' | 'noteEntries'> {
  return {
    lastMeetingDate: meta?.lastMeetingDate ?? null,
    nextReviewDate: meta?.nextReviewDate ?? null,
    notes: meta?.notes ?? '',
    noteEntries: parseNoteEntries(meta, fallbackTimestamp),
  };
}

// Purge records that were soft-deleted more than 7 days ago.
// Called on every listProfiles() so cleanup happens automatically over time.
async function purgeExpiredDeletions(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('client_profiles')
    .delete()
    .eq('user_id', user.id)
    .lt('deleted_at', cutoff);
}

export async function listProfiles(): Promise<ClientProfile[]> {
  // Purge soft-deleted profiles older than 7 days in the background
  purgeExpiredDeletions().catch(() => {});

  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inputs: migrateInputs(row.inputs as FireInputs),
    tags: Array.isArray(row.tags) ? row.tags : [],
    ...parseMeta(row.meta, row.updated_at),
  }));
}

export async function getProfile(id: string): Promise<ClientProfile | null> {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    inputs: migrateInputs(data.inputs as FireInputs),
    tags: Array.isArray(data.tags) ? data.tags : [],
    ...parseMeta(data.meta, data.updated_at),
  };
}

/** Sticky flag: once we know the tags column doesn't exist, stop trying to write it.
 *  Reset by clearing localStorage 'profileStorage.tagsColumnExists' once the migration runs. */
const TAGS_COLUMN_FLAG = 'profileStorage.tagsColumnExists';
function tagsColumnLikelyExists(): boolean {
  // Default true (assume migration is applied). Once we hit a column error, we flip to false.
  const v = localStorage.getItem(TAGS_COLUMN_FLAG);
  return v !== 'false';
}
function markTagsColumnMissing() {
  try { localStorage.setItem(TAGS_COLUMN_FLAG, 'false'); } catch {}
}

export async function saveProfile(profile: ClientProfile): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const baseRow = {
    id: profile.id,
    user_id: user.id,
    name: profile.name,
    inputs: profile.inputs,
    meta: {
      lastMeetingDate: profile.lastMeetingDate ?? null,
      nextReviewDate: profile.nextReviewDate ?? null,
      noteEntries: profile.noteEntries ?? [],
    },
    updated_at: new Date().toISOString(),
  };

  // Two-attempt pattern: write with tags first; if anything goes wrong, retry without tags.
  // This is bulletproof — we don't try to interpret the error format. The cost is one extra
  // round trip on the (rare) error path.
  if (tagsColumnLikelyExists()) {
    const { error } = await supabase
      .from('client_profiles')
      .upsert({ ...baseRow, tags: profile.tags ?? [] });
    if (!error) return;
    console.error('[profileStorage] save with tags failed — retrying without tags. Original error:', error);
    markTagsColumnMissing();
  }

  const { error: retryError } = await supabase.from('client_profiles').upsert(baseRow);
  if (retryError) throw retryError;
}

export async function createProfile(name: string, inputs?: FireInputs): Promise<ClientProfile> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const baseRow = {
    user_id: user.id,
    name,
    inputs: inputs || defaultInputs,
    meta: {},
  };

  let data: any = null;
  let error: any = null;

  if (tagsColumnLikelyExists()) {
    const result = await supabase
      .from('client_profiles')
      .insert({ ...baseRow, tags: [] })
      .select()
      .single();
    data = result.data;
    error = result.error;
    if (error) {
      console.error('[profileStorage] create with tags failed — retrying without tags. Original error:', error);
      markTagsColumnMissing();
    }
  }

  if (!data || error) {
    const retry = await supabase.from('client_profiles').insert(baseRow).select().single();
    data = retry.data;
    error = retry.error;
  }

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    inputs: migrateInputs(data.inputs as FireInputs),
    tags: Array.isArray(data.tags) ? data.tags : [],
    ...parseMeta(data.meta, data.updated_at),
  };
}

// Soft delete: sets deleted_at timestamp instead of removing the row.
// Records are permanently purged after 7 days via purgeExpiredDeletions().
export async function deleteProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function renameProfile(id: string, newName: string): Promise<void> {
  const { error } = await supabase
    .from('client_profiles')
    .update({ name: newName, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function duplicateProfile(sourceId: string, newName: string): Promise<ClientProfile | null> {
  const source = await getProfile(sourceId);
  if (!source) return null;
  return createProfile(newName, JSON.parse(JSON.stringify(source.inputs)));
}

/** List profiles soft-deleted within the last 7 days (recoverable). */
export async function listDeletedProfiles(): Promise<(ClientProfile & { deletedAt: string })[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .not('deleted_at', 'is', null)
    .gte('deleted_at', cutoff)
    .order('deleted_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inputs: migrateInputs(row.inputs as FireInputs),
    tags: Array.isArray(row.tags) ? row.tags : [],
    ...parseMeta(row.meta, row.updated_at),
    deletedAt: row.deleted_at,
  }));
}

/** Restore a soft-deleted profile by clearing its deleted_at timestamp. */
export async function restoreProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_profiles')
    .update({ deleted_at: null })
    .eq('id', id);
  if (error) throw error;
}

export function exportProfile(profile: ClientProfile): string {
  return JSON.stringify(profile, null, 2);
}

export async function importProfile(json: string): Promise<ClientProfile> {
  const parsed = JSON.parse(json);
  return createProfile(parsed.name || 'Imported Client', parsed.inputs || defaultInputs);
}
