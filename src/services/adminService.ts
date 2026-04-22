import { supabase } from './supabaseClient';
import { Tier } from './subscriptionService';

export interface AdminUser {
  userId: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  tier: Tier | 'starter';
  status: string;
  trialEndsAt: string | null;
}

export async function adminListUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users');
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    email: row.email,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at ?? null,
    tier: row.tier as Tier,
    status: row.status,
    trialEndsAt: row.trial_ends_at ?? null,
  }));
}

export async function adminSetSubscription(
  userId: string,
  tier: Tier,
  status: 'active' | 'trialing' | 'none',
  trialEndsAt?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc('admin_set_subscription', {
    p_user_id: userId,
    p_tier: tier,
    p_status: status,
    p_trial_ends_at: trialEndsAt ?? null,
  });
  if (error) throw error;
}
