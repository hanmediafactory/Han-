// Production-ready API URL Configuration Helper
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export function getApiUrl(path: string): string {
  const cleanPath = path.replace(/^\/+/, "");
  return API_BASE ? `${API_BASE}/api/${cleanPath}` : `/api/${cleanPath}`;
}
