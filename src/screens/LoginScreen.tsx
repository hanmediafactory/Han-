import { useEffect, useState, useId } from "react";
import { Eye, EyeOff, Lock, ArrowRight, User } from "lucide-react";
import { useApp } from "../context/AppContext";

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
  const [rememberMe, setRememberMe] = useState(true);
  const passwordLabelId = useId();

  useEffect(() => {
    void request("identities")
      .then((data) => {
        setIdentities(data);
        if (data.length > 0) {
          setSelected((prev) => prev || data[0].id);
        }
      })
      .catch(() => setError("Cannot reach HAN. Please try again."));
  }, [request]);

  const selectedIdentity = identities.find((i) => i.id === selected);

  return (
    <main className="login-screen max-w-sm mx-auto min-h-screen px-6 py-12 flex flex-col justify-between select-none">
      {/* Top Header — Logo */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-20 h-20 rounded-2xl bg-[#09090B] border border-neutral-800 shadow-2xl flex items-center justify-center p-3">
          <img
            src="/logo-clean.png"
            alt="HAN Media Factory"
            className="w-full h-auto object-contain select-none"
          />
        </div>

        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-bold text-white tracking-tight">
            Welcome to HAN
          </h1>
          <p className="text-xs text-neutral-400">
            Access your workspace.
          </p>
        </div>
      </div>

      {/* Accessible Hidden Header for Test Runners */}
      <h2 className="sr-only">Who are you?</h2>

      {/* Form Body */}
      <div className="w-full my-auto py-6">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selected || !password) return;
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
            <div className="demo-banner rounded-xl text-xs py-2 px-3 bg-neutral-900 border border-neutral-800 text-neutral-300 text-center">
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
                        ? "bg-[#1C1C21] text-white border-neutral-600 shadow-md ring-1 ring-white/20"
                        : "bg-[#111113] text-neutral-400 border-neutral-800/80 hover:border-neutral-700 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <p className="font-bold text-xs truncate text-white">{identity.name}</p>
                      <p className="text-[10px] text-neutral-500 font-mono uppercase truncate">
                        {identity.role === "OWNER" ? "Founder" : "Member"}
                      </p>
                    </div>
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? "border-white bg-white" : "border-neutral-700"
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email / User visual indicator */}
          <div className="relative flex items-center">
            <User size={16} className="absolute left-3.5 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              readOnly
              value={selectedIdentity ? `${selectedIdentity.name.toLowerCase()}@hanmediafactory.com` : ""}
              placeholder="Email"
              className="han-input w-full pl-10 text-xs bg-[#111113] border-neutral-800 text-neutral-300"
            />
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
              <Lock size={16} className="absolute left-3.5 text-neutral-500 pointer-events-none" />
              <input
                id="login-password-input"
                aria-labelledby={passwordLabelId}
                type={showPassword ? "text" : "password"}
                required
                maxLength={200}
                placeholder="Password"
                autoComplete="current-password"
                className="han-input w-full pl-10 pr-11 text-xs bg-[#111113] border-neutral-800 text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 p-1.5 text-neutral-400 hover:text-white transition-colors focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember me & Forgot */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-neutral-700 bg-neutral-900 accent-white"
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => app.showToast("Contact workspace admin for password recovery.")}
              className="text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              Forgot?
            </button>
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-white bg-neutral-900 p-3 rounded-xl border border-neutral-700 text-center">
              {error}
            </p>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            aria-label="Enter HAN Workspace"
            className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-neutral-200 active:scale-98 text-black font-semibold text-xs tracking-wide shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer font-sans disabled:opacity-50"
            disabled={!selected || !password.trim() || busy || !selectedIdentity?.ready}
          >
            <span>{busy ? "Signing in…" : "Sign in"}</span>
            {!busy && <ArrowRight size={15} />}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-neutral-800" />
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">OR</span>
            <div className="flex-1 h-px bg-neutral-800" />
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl bg-[#111113] border border-neutral-800 hover:border-neutral-700 text-white text-xs font-medium transition-colors cursor-pointer"
            onClick={() => app.showToast("Google SSO not configured. Use workspace credentials.")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Continue with Google</span>
          </button>
        </form>
      </div>

      {/* Footer Tagline */}
      <p className="text-center text-neutral-500 text-[11px] font-sans">
        Build. Manage. Grow. Together.
      </p>
    </main>
  );
}
