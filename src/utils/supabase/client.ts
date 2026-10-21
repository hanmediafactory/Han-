import { createClient } from "@supabase/supabase-js";

const env = (typeof globalThis !== "undefined" ? (globalThis as any).process?.env : undefined) || {};
const publicEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined;

export const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || publicEnv?.VITE_SUPABASE_URL || "";
export const supabasePublishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || publicEnv?.VITE_SUPABASE_PUBLISHABLE_KEY || "";

function requireConfiguration() {
  if (!supabaseUrl || !supabasePublishableKey) throw new Error("Supabase client is not configured.");
  return { url: supabaseUrl, key: supabasePublishableKey };
}

export function createClientComponentClient() {
  const { url, key } = requireConfiguration();
  return createClient(url, key);
}

export const supabase = supabaseUrl && supabasePublishableKey ? createClient(supabaseUrl, supabasePublishableKey) : null;
