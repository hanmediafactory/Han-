import { createServerClient, type CookieOptions } from "@supabase/ssr";

const env = (typeof globalThis !== "undefined" ? (globalThis as any).process?.env : undefined) || {};

export const supabaseUrl =
  env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://vouxtthsvlufjvperhxz.supabase.co";

export const supabasePublishableKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_YlaWw18kkKnTA4g7bmKFcQ_l31mTtDa";

export function updateSession(request: any, response: any) {
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      get(name: string) {
        return request?.cookies?.get?.(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request?.cookies?.set?.({ name, value, ...options });
        response?.cookies?.set?.({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request?.cookies?.set?.({ name, value: "", ...options });
        response?.cookies?.set?.({ name, value: "", ...options });
      },
    },
  });
}
