import { createClient } from '@supabase/supabase-js';

const rawUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  '';

const rawKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  '';

const formatUrl = (url) => {
  if (!url) return '';
  let trimmed = url.trim();
  if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = `https://${trimmed}`;
  }
  return trimmed;
};

const sanitizedUrl = formatUrl(rawUrl);

export const isSupabaseConfigured = () => {
  return (
    Boolean(sanitizedUrl) &&
    Boolean(rawKey) &&
    !sanitizedUrl.includes('placeholder.supabase.co') &&
    !rawKey.includes('placeholder-key') &&
    sanitizedUrl.startsWith('https://')
  );
};

const supabaseUrl = isSupabaseConfigured() ? sanitizedUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured() ? rawKey.trim() : 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

