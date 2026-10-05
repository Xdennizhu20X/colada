import { createClient, SupabaseClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Sanitizar la URL eliminando /rest/v1 o barras al final si se ingresaron por error
const cleanUrl = rawUrl
  .trim()
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/$/, '');

export const isSupabaseConfigured = Boolean(
  cleanUrl && 
  rawAnonKey && 
  cleanUrl !== 'https://your-project.supabase.co' &&
  !cleanUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(cleanUrl, rawAnonKey.trim())
  : null;
