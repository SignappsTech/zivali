import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, type Env, requireEnv } from './env.ts';

/** Service-role client (bypasses RLS). Server side only; never return it or its key to a client. */
export function serviceClient(get: Env = env): SupabaseClient {
  const key = get('SUPABASE_SECRET_KEY') ?? requireEnv('SUPABASE_SERVICE_ROLE_KEY', get);
  return createClient(requireEnv('SUPABASE_URL', get), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
