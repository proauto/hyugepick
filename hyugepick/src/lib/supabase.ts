import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/utils';

export const supabase = createClient(env.supabase.url, env.supabase.anonKey, {
  auth: {
    flowType: 'pkce'
  }
});