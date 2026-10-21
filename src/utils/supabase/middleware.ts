import { createServerClient, type CookieOptions } from "@supabase/ssr";

const env = (typeof globalThis !== "undefined" ? (globalThis as any).process?.env : undefined) || {};

export const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || "";
export const supabasePublishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

function requireConfiguration() {
  if (!supabaseUrl || !supabasePublishableKey) throw new Error("Supabase client is not configured.");
  return { url: supabaseUrl, key: supabasePublishableKey };
}

export function updateSession(request: any, response: any) {
  const { url, key } = requireConfiguration();
  return createServerClient(url, key, {
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
