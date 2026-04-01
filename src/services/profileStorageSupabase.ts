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
      ...inc,
      annualInvestmentContribution: inc.annualInvestmentContribution ?? 12000,
      withdrawalRate: inc.withdrawalRate ?? 3.5,
      cpfLifeMonthly: inc.cpfLifeMonthly ?? 1500,
    },
    assets: {
      cashSavings: assets.cashSavings ?? 0,
      investments: assets.investments ?? 0,
      // Migrate old single cpfBalance → split into OA/SA/MA
      cpfOA: assets.cpfOA ?? (assets.cpfBalance ? Math.round(assets.cpfBalance * 0.6) : 0),
      cpfSA: assets.cpfSA ?? (assets.cpfBalance ? Math.round(assets.cpfBalance * 0.3) : 0),
      cpfMA: assets.cpfMA ?? (assets.cpfBalance ? Math.round(assets.cpfBalance * 0.1) : 0),
      cashReturnRate: assets.cashReturnRate ?? 1,
      investmentReturnRate: assets.investmentReturnRate ?? 7,
    },
    policies: (inputs.policies || []).map((p: any): InsurancePolicy => ({
      ...p,
      deathSumAssured: p.deathSumAssured ?? 0,
      tpdSumAssured: p.tpdSumAssured ?? 0,
      ciSumAssured: p.ciSumAssured ?? 0,
    })),
  };
}

export async function listProfiles(): Promise<ClientProfile[]> {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inputs: migrateInputs(row.inputs as FireInputs),
  }));
}

export async function getProfile(id: string): Promise<ClientProfile | null> {
  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    inputs: migrateInputs(data.inputs as FireInputs),
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
  };
}

export async function deleteProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from('client_profiles')
    .delete()
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
