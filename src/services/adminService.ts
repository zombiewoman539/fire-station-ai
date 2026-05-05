import { supabase } from './supabaseClient';
import { Tier } from './subscriptionService';

export interface AdminUser {
  userId: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  /** Most-recent meaningful activity: max of sign-in, profile edit, task created/completed.
   *  Null when the admin_list_user_activity RPC isn't available (e.g. migration not yet run). */
  lastActiveAt: string | null;
  tier: Tier | 'starter';
  status: string;
  trialEndsAt: string | null;
}

export async function adminListUsers(): Promise<AdminUser[]> {
  // Fetch the base admin list and the activity overlay in parallel.
  // If the activity RPC fails (e.g. migration not yet run), we fall back to lastSignInAt.
  const [usersResult, activityResult] = await Promise.all([
    supabase.rpc('admin_list_users'),
    supabase.rpc('admin_list_user_activity').then(
      r => r,
      // swallow — the migration may not be deployed yet
      () => ({ data: null as any, error: { message: 'rpc not available' } as any }),
    ),
  ]);

  if (usersResult.error) throw usersResult.error;

  const activityByUser: Record<string, string | null> = {};
  if (!activityResult.error && Array.isArray(activityResult.data)) {
    for (const row of activityResult.data as any[]) {
      activityByUser[row.user_id] = row.last_active_at ?? null;
    }
  }

  return (usersResult.data ?? []).map((row: any) => ({
    userId: row.user_id,
    email: row.email,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at ?? null,
    lastActiveAt: activityByUser[row.user_id] ?? row.last_sign_in_at ?? null,
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
