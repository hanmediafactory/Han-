import { createServerClient, type CookieOptions } from "@supabase/ssr";

const env = (typeof globalThis !== "undefined" ? (globalThis as any).process?.env : undefined) || {};

export const supabaseUrl =
  env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://vouxtthsvlufjvperhxz.supabase.co";

export const supabasePublishableKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_YlaWw18kkKnTA4g7bmKFcQ_l31mTtDa";

export function createServerComponentClient(cookieStore?: {
  get: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, options: CookieOptions) => void;
}) {
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      get(name: string) {
        return cookieStore?.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore?.set(name, value, options);
        } catch {
          // The `set` method was called from a Server Component.
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore?.set(name, "", { ...options, maxAge: 0 });
        } catch {
          // The `delete` method was called from a Server Component.
        }
      },
    },
  });
}
