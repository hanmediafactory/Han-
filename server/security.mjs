export const knownDefaults = new Set(["Password123!", "HarshaPass2026!", "NihaalPass2026!", "LalithaPass2026!", "test-only-password-123456", "DemoOnly2026!"]);
export function requireProductionPassword(password) {
  if (knownDefaults.has(password)) throw Object.assign(new Error("Choose a unique password; published example credentials are not allowed."), { status: 400 });
}
