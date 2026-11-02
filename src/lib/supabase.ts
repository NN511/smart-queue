import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://jgjpplphoyaxcndgoplz.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_b4CtIn7FYxbMseKEzsRnuA_ytaim85I';

declare global {
  var __supabaseClient: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__supabaseClient ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__supabaseClient = supabase;
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase;