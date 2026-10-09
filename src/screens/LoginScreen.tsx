import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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

  useEffect(() => {
    void request("identities")
      .then((data) => {
        setIdentities(data);
        if (data.length > 0) {
          setSelected(data[0].id);
        }
      })
      .catch(() => setError("Cannot reach HAN. Please try again."));
  }, [request]);

  const selectedIdentity = identities.find((i) => i.id === selected);

  return (
    <main className="login-screen max-w-md mx-auto min-h-screen px-6 py-12 flex flex-col justify-between">
      <div className="text-center space-y-2">
        <p className="han-tagline text-neutral-400">Your execution command center</p>
        <h1 className="font-serif text-6xl tracking-wider text-black">HAN</h1>
      </div>

      <div className="space-y-6 my-auto">
        <div className="text-center">
          <h2 className="font-serif text-3xl font-bold text-black">Who are you?</h2>
          <p className="text-xs text-neutral-500 mt-1">
            Manage projects, tasks, money, and client follow-ups in one workspace.
          </p>
        </div>

        <form
          className="space-y-5"
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
          {identities[0]?.demo && <div className="demo-banner rounded-xl">Demo data only. Choose any account and use <b>DemoOnly2026!</b></div>}
          <div
            role="radiogroup"
            aria-label="Account Identity"
            className="space-y-3"
          >
            {identities.map((identity) => {
              const isSelected = selected === identity.id;
              return (
                <div
                  role="radio"
                  tabIndex={isSelected ? 0 : -1}
                  aria-checked={isSelected}
                  key={identity.id}
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
                      setSelected(identities[next].id); setPassword(""); setError("");
                      (e.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]')[next])?.focus();
                    }
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(identity.id);
                      setError("");
                    }
                  }}
                  className={`w-full p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-black text-white border-black shadow-md"
                      : "bg-white text-black border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex flex-col text-left">
                    <span className="font-bold text-base">{identity.name}</span>
                    <span
                      className={`text-xs uppercase tracking-widest font-mono mt-0.5 ${
                        isSelected ? "text-neutral-300" : "text-neutral-500"
                      }`}
                    >
                      {identity.role === "OWNER" ? "Owner / Admin" : "Team Member"}
                    </span>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-white bg-white" : "border-neutral-300"
                    }`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-black" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2 pt-2">
            <input type="text" autoComplete="username" value={selectedIdentity?.name || ""} readOnly hidden aria-hidden="true" />
            <label htmlFor="login-password-input" className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
              Account Password {selectedIdentity ? `for ${selectedIdentity.name}` : ""}
            </label>
            <div className="relative flex items-center">
              <input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                required
                maxLength={200}
                placeholder="Enter password..."
                autoComplete="current-password"
                className="han-input w-full pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 p-2 text-neutral-400 hover:text-neutral-900 transition-colors focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs font-semibold text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="han-btn-primary"
            disabled={!selected || !password.trim() || busy || !selectedIdentity?.ready}
          >
            {busy ? "Signing in…" : "Enter HAN Workspace →"}
          </button>
        </form>
      </div>

      <p className="han-tagline text-center text-neutral-400 text-xs">Build. Execute. Grow.</p>
      <p className="text-xs text-neutral-600 text-center">Forgot your password? Ask the workspace owner to reset your account. Owner recovery is performed by the server administrator.</p>
    </main>
  );
}
