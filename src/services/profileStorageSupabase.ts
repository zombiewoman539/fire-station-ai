import { supabase } from './supabaseClient';
import { ClientProfile } from '../profileTypes';
import { FireInputs, InsurancePolicy } from '../types';
import { defaultInputs } from '../defaults';

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
      cashSavings:          assets.cashSavings ?? 0,
      investments:          assets.investments ?? 0,
      cashReturnRate:       assets.cashReturnRate ?? 1,
      investmentReturnRate: assets.investmentReturnRate ?? 7,
      investmentBuckets:    assets.investmentBuckets ?? [],
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
      nomineeName: p.nomineeName ?? '',
      nomineeClientId: p.nomineeClientId ?? null,
      insurer: p.insurer ?? '',
      policyNumber: p.policyNumber ?? '',
      policyStatus: p.policyStatus ?? 'in-force',
      commencementDate: p.commencementDate ?? null,
      maturityDate: p.maturityDate ?? null,
      fundAllocations: p.fundAllocations ?? [],
    })),
    estatePlanning: {
      lpa: inputs.estatePlanning?.lpa ?? false,
      will: inputs.estatePlanning?.will ?? false,
    },
  };
}

function parseMeta(meta: any): Pick<ClientProfile, 'lastMeetingDate' | 'nextReviewDate' | 'notes'> {
  return {
    lastMeetingDate: meta?.lastMeetingDate ?? null,
    nextReviewDate: meta?.nextReviewDate ?? null,
    notes: meta?.notes ?? '',
  };
}

// Purge records that were soft-deleted more than 7 days ago.
// Called on every listProfiles() so cleanup happens automatically over time.
async function purgeExpiredDeletions(): Promise<void> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await supabase
    .from('client_profiles')
    .delete()
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
    ...parseMeta(row.meta),
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
    ...parseMeta(data.meta),
  };
}

export async function saveProfile(profile: ClientProfile): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('client_profiles')
    .upsert({
      id: profile.id,
      user_id: user.id,
      name: profile.name,
      inputs: profile.inputs,
      meta: {
        lastMeetingDate: profile.lastMeetingDate ?? null,
        nextReviewDate: profile.nextReviewDate ?? null,
        notes: profile.notes ?? '',
      },
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function createProfile(name: string, inputs?: FireInputs): Promise<ClientProfile> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('client_profiles')
    .insert({
      user_id: user.id,
      name,
      inputs: inputs || defaultInputs,
      meta: {},
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    inputs: migrateInputs(data.inputs as FireInputs),
    ...parseMeta(data.meta),
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

export function exportProfile(profile: ClientProfile): string {
  return JSON.stringify(profile, null, 2);
}

export async function importProfile(json: string): Promise<ClientProfile> {
  const parsed = JSON.parse(json);
  return createProfile(parsed.name || 'Imported Client', parsed.inputs || defaultInputs);
}
