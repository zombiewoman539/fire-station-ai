import { supabase } from './supabaseClient';
import { ClientProfile } from '../profileTypes';
import { FireInputs, InsurancePolicy } from '../types';
import { defaultInputs } from '../defaults';

// Migrate old profiles that don't have the new insurance fields
function migrateInputs(inputs: FireInputs): FireInputs {
  return {
    ...inputs,
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
