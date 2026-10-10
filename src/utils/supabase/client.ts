import { createClient } from "@supabase/supabase-js";

const env = (typeof globalThis !== "undefined" ? (globalThis as any).process?.env : undefined) || {};

export const supabaseUrl =
  env.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_URL : undefined) ||
  "https://vouxtthsvlufjvperhxz.supabase.co";

export const supabasePublishableKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  (typeof import.meta !== "undefined" ? import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY : undefined) ||
  "sb_publishable_YlaWw18kkKnTA4g7bmKFcQ_l31mTtDa";

export function createClientComponentClient() {
  return createClient(supabaseUrl, supabasePublishableKey);
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
