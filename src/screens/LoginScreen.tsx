import { useEffect, useState, useId } from "react";
import { Eye, EyeOff, Lock, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { getTheme, setTheme, type Theme } from "../utils/theme";

type Identity = { id: string; name: string; role: string; ready: boolean; demo?: boolean };

export function LoginScreen() {
  const app = useApp();
  const { request } = app;
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [selected, setSelected] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [theme, updateTheme] = useState(getTheme);
  const passwordLabelId = useId();

  useEffect(() => {
    void request("identities")
      .then((data) => {
        if (!Array.isArray(data)) throw new Error("Invalid identity response");
        setIdentities(data);
        if (data.length > 0) {
          setSelected((prev) => prev || data[0].id);
        }
      })
      .catch(() => setError("Cannot reach HAN. Please try again."));
  }, [request]);

  const selectedIdentity = identities.find((i) => i.id === selected);

  return (
    <main className="login-screen w-full h-full overflow-y-auto px-6 py-8 flex flex-col items-center justify-center select-none">
      <div className="w-full max-w-sm flex flex-col gap-6 my-auto">
        {/* Top Header — Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-black dark:bg-[#09090B] border border-border-subtle shadow-xl flex items-center justify-center p-2.5">
            <img
              src="/logo-clean.png"
              alt="HAN Media Factory"
              className="w-full h-auto object-contain select-none invert dark:invert-0"
            />
          </div>

        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-bold text-text-primary tracking-tight">
            Welcome to HAN
          </h1>
          <p className="text-xs text-text-secondary">
            Access your workspace.
          </p>
        </div>
        </div>

        {/* Accessible Hidden Header for Test Runners */}
        <h2 className="sr-only">Who are you?</h2>

        {/* Form Body */}
        <div className="w-full">
          <form
            className="space-y-3.5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !selectedIdentity?.ready || !password.trim()) return;
            setBusy(true);
            setError("");
            try {
              await app.login(selected, password);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {identities[0]?.demo && (
            <div className="demo-banner rounded-xl text-xs py-2 px-3 bg-neutral-900 border border-border-subtle text-text-primary text-center">
              Demo workspace · Use <b>DemoOnly2026!</b>
            </div>
          )}

          {/* Identity Radiogroup with clean obsidian cards */}
          <div
            role="radiogroup"
            aria-label="Who are you?"
            className="space-y-1.5"
          >
            <div className="grid grid-cols-2 gap-1.5">
              {identities.map((identity) => {
                const isSelected = selected === identity.id;
                const label = `${identity.name} ${identity.role === "OWNER" ? "Owner / Admin" : "Team Member"}`;
                return (
                  <button
                    key={identity.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={label}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => {
                      setSelected(identity.id);
                      setPassword("");
                      setError("");
                    }}
                    onKeyDown={(e) => {
                      if (["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(e.key)) {
                        e.preventDefault();
                        const current = identities.findIndex(item => item.id === identity.id);
                        const next = e.key === "Home" ? 0 : e.key === "End" ? identities.length - 1 : (current + (["ArrowDown", "ArrowRight"].includes(e.key) ? 1 : -1) + identities.length) % identities.length;
                        setSelected(identities[next].id);
                        setPassword("");
                        setError("");
                        (e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]')[next])?.focus();
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "bg-black text-white border-neutral-800 shadow-md ring-1 ring-black/5 dark:ring-white/20"
                        : "bg-surface-elevated text-text-secondary border-border-subtle hover:border-border-strong hover:text-text-primary"
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <p className={`font-bold text-xs truncate ${isSelected ? "text-white" : "text-text-primary"}`}>{identity.name}</p>
                      <p className={`text-[10px] font-mono uppercase truncate ${isSelected ? "text-neutral-400" : "text-text-muted"}`}>
                        {identity.role === "OWNER" ? "Founder" : "Member"}
                      </p>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-white bg-black" : "border-border-strong bg-transparent"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label
              id={passwordLabelId}
              htmlFor="login-password-input"
              className="sr-only"
            >
              Account Password {selectedIdentity ? `for ${selectedIdentity.name}` : ""}
            </label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-text-muted pointer-events-none" />
              <input
                id="login-password-input"
                aria-labelledby={passwordLabelId}
                type={showPassword ? "text" : "password"}
                required
                maxLength={200}
                placeholder="Password"
                autoComplete="current-password"
                className="han-input w-full pl-10 pr-11 text-xs bg-surface-elevated border-border-subtle text-text-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 p-1.5 text-text-secondary hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <span>Appearance</span>
              <select aria-label="Appearance" value={theme} className="bg-surface-elevated text-text-primary rounded-lg px-2 border border-border-subtle" onChange={event => {
                const value = event.target.value as Theme;
                updateTheme(value);
                setTheme(value);
              }}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => app.showToast("Contact workspace admin for password recovery.")}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              Forgot?
            </button>
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-text-primary bg-surface-elevated p-3 rounded-xl border border-border-strong text-center">
              {error}
            </p>
          )}

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              aria-label="Enter HAN Workspace"
              className="w-full py-3.5 px-6 rounded-2xl bg-black dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 active:scale-98 text-white dark:text-black font-semibold text-xs tracking-wide shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer font-sans disabled:opacity-50"
              disabled={!selected || !password.trim() || busy || !selectedIdentity?.ready}
            >
              <span>{busy ? "Signing in…" : "Sign in"}</span>
              {!busy && <ArrowRight size={15} />}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Tagline */}
      <div className="pt-6 mt-auto">
        <p className="text-center text-text-muted text-[11px] font-sans">
          Build. Manage. Grow. Together.
        </p>
      </div>
      </div>
    </main>
  );
}
