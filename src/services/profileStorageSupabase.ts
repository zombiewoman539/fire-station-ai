import { ClientProfile, NoteEntry } from '../profileTypes';
import { FireInputs, InsurancePolicy, Nominee } from '../types';
import { defaultInputs } from '../defaults';

const BASE = '';

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
  if (typeof meta?.notes === 'string' && meta.notes.trim().length > 0) {
    return [{ id: newId(), createdAt: fallbackTimestamp, body: meta.notes }];
  }
  return [];
}

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
      retirementExpenseItems:        inc.retirementExpenseItems ?? undefined,
      retirementIncomeStreams:       inc.retirementIncomeStreams ?? undefined,
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
      id: /^\d+$/.test(String(p.id ?? '')) ? crypto.randomUUID() : (p.id ?? crypto.randomUUID()),
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

function mapRow(row: any): ClientProfile {
  return {
    id: row.id,
    name: row.name,
    userId: row.user_id ?? 'local',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inputs: migrateInputs(row.inputs as FireInputs),
    tags: Array.isArray(row.tags) ? row.tags : [],
    ...parseMeta(row.meta, row.updated_at),
  };
}

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res;
}

export async function listProfiles(): Promise<ClientProfile[]> {
  const res = await apiFetch('/api/profiles');
  const rows = await res.json();
  return (rows as any[]).map(mapRow);
}

export async function listProfilesPaged(
  page: number = 0,
  pageSize: number = 50,
): Promise<{ data: ClientProfile[]; hasMore: boolean }> {
  const res = await apiFetch(`/api/profiles/paged?page=${page}&pageSize=${pageSize}`);
  const { data, hasMore } = await res.json();
  return { data: (data as any[]).map(mapRow), hasMore };
}

export async function getProfile(id: string): Promise<ClientProfile | null> {
  try {
    const res = await fetch(`${BASE}/api/profiles/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed: ${res.status}`);
    return mapRow(await res.json());
  } catch {
    return null;
  }
}

export async function saveProfile(profile: ClientProfile): Promise<void> {
  await apiFetch(`/api/profiles/${profile.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: profile.name,
      inputs: profile.inputs,
      tags: profile.tags ?? [],
      meta: {
        lastMeetingDate: profile.lastMeetingDate ?? null,
        nextReviewDate: profile.nextReviewDate ?? null,
        noteEntries: profile.noteEntries ?? [],
      },
    }),
  });
}

export async function createProfile(name: string, inputs?: FireInputs): Promise<ClientProfile> {
  const res = await apiFetch('/api/profiles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, inputs: inputs || defaultInputs }),
  });
  return mapRow(await res.json());
}

export async function deleteProfile(id: string): Promise<void> {
  await apiFetch(`/api/profiles/${id}`, { method: 'DELETE' });
}

export async function renameProfile(id: string, newName: string): Promise<void> {
  await apiFetch(`/api/profiles/${id}/rename`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newName }),
  });
}

export async function duplicateProfile(sourceId: string, newName: string): Promise<ClientProfile | null> {
  const source = await getProfile(sourceId);
  if (!source) return null;
  return createProfile(newName, JSON.parse(JSON.stringify(source.inputs)));
}

export async function listDeletedProfiles(): Promise<(ClientProfile & { deletedAt: string })[]> {
  const res = await apiFetch('/api/profiles/deleted');
  const rows = await res.json();
  return (rows as any[]).map(row => ({ ...mapRow(row), deletedAt: row.deleted_at }));
}

export async function restoreProfile(id: string): Promise<void> {
  await apiFetch(`/api/profiles/${id}/restore`, { method: 'POST' });
}

export function exportProfile(profile: ClientProfile): string {
  return JSON.stringify(profile, null, 2);
}

export async function importProfile(json: string): Promise<ClientProfile> {
  const parsed = JSON.parse(json);
  return createProfile(parsed.name || 'Imported Client', parsed.inputs || defaultInputs);
}
