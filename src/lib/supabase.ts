import { createClient, SupabaseClient } from '@supabase/supabase-js';

const defaultUrl = 'https://jgjpplphoyaxcndgoplz.supabase.co';
const defaultAnonKey = 'sb_publishable_b4CtIn7FYxbMseKEzsRnuA_ytaim85I';

const supabaseUrl =
  (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http'))
    ? process.env.NEXT_PUBLIC_SUPABASE_URL
    : defaultUrl;

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultAnonKey;

const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

declare global {
  var __supabaseClient: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__supabaseClient ||
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__supabaseClient = supabase;
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
