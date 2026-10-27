import { useEffect, useState, useId } from "react";
import { Eye, EyeOff, Lock, ArrowRight } from "lucide-react";
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

  const selectedIdentity = identities.find((identity) => identity.id === selected);



  return (
    <main
      className="login-screen relative w-full min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-x-hidden select-none"
    >
      <div className="login-frame relative z-10 w-full max-w-[480px] flex flex-col items-center my-auto py-6 sm:py-10">
        <div className="mb-10 flex flex-col items-center justify-center animate-fadeIn">
          <img
            src="/logo-clean.png"
            alt="HAN Media Factory"
            className="h-[68px] sm:h-[72px] w-auto object-contain drop-shadow-2xl select-none"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/logo-clean.png";
            }}
          />
        </div>

        <h2 className="sr-only">Who are you?</h2>

        <div className="login-card w-full p-6 sm:p-8 sm:px-9 flex flex-col justify-between transition-all duration-300 animate-fadeIn">
          <div className="text-center space-y-3 mb-7">
            <h1
              className="font-serif text-3xl sm:text-[44px] sm:leading-[48px] font-semibold tracking-tight text-[#F3F4F6]"
              style={{ textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)" }}
            >
              Welcome Back
            </h1>
            <p className="font-sans text-sm sm:text-base text-[#A1A1AA] font-normal leading-snug">
              Log in to continue to HAN Media Factory
            </p>
          </div>

          <form
            className="space-y-4"
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
            <div
              role="radiogroup"
              aria-label="Who are you?"
              className="grid grid-cols-2 gap-2 pb-1"
            >
              {identities.map((identity) => {
                const isSelected = selected === identity.id;
                const label = identity.name + " " + (identity.role === "OWNER" ? "Owner / Admin" : "Team Member");
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
                    onKeyDown={(event) => {
                      if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Home", "End"].includes(event.key)) return;
                      event.preventDefault();
                      const current = identities.findIndex(item => item.id === identity.id);
                      const next = event.key === "Home" ? 0 : event.key === "End" ? identities.length - 1 : (current + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1) + identities.length) % identities.length;
                      setSelected(identities[next].id);
                      setPassword("");
                      setError("");
                      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
                    }}
                    className={"px-3 py-2 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between text-xs " +
                      (isSelected
                        ? "bg-white/12 border-white/30 text-white shadow-sm ring-1 ring-white/20"
                        : "bg-white/[0.04] border-white/[0.08] text-[#A1A1AA] hover:bg-white/[0.08] hover:text-white")}
                  >
                    <div className="truncate mr-1">
                      <span className="font-medium block truncate">{identity.name}</span>
                      <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider block">
                        {identity.role === "OWNER" ? "Founder" : "Member"}
                      </span>
                    </div>
                    <div
                      className={"w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 " +
                        (isSelected ? "border-white bg-white/20" : "border-white/20")}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="space-y-1">
              <label
                id={passwordLabelId}
                htmlFor="login-password-input"
                className="sr-only"
              >
                Account Password {selectedIdentity ? `for ${selectedIdentity.name}` : ""}
              </label>
              <div className="relative flex items-center group">
                <Lock
                  size={18}
                  className="absolute left-4 text-[#A1A1AA] group-focus-within:text-white transition-colors pointer-events-none"
                />
                <input
                  id="login-password-input"
                  aria-labelledby={passwordLabelId}
                  type={showPassword ? "text" : "password"}
                  required
                  maxLength={200}
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(ed) => setPassword(ed.target.value)}
                  className="w-full h-14 pl-12 pr-12 rounded-[14px] font-sans text-sm sm:text-base text-white placeholder-[#A1AAAA] outline-none transition-all duration-200 focus:border-white/40 focus:ring-1 focus:ring-white/20"
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.2)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 p-1 text-[#A1A1AA] hover:text-white transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>


            <div className="flex items-center justify-between pt-1 text-sm font-sans">
              <span className="text-[#A1A1AA] text-xs">Private workspace access</span>

              <button
                type="button"
                onClick={() => app.showToast("Contact workspace admin for password recovery.")}
                className="text-[#A1A1AA] hover:text-white transition-colors cursor-pointer text-sm font-sans hover:underline"
              >
                Forgot password?
              </button>
            </div>


            {error && (
              <p
                role="alert"
                className="text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl text-center"
              >
                {error}
              </p>
            )}


<div className="pt-2">
              <button
                type="submit"
                aria-label="Enter HAN"
                disabled={!selected || !password.trim() || busy || !selectedIdentity?.ready}
                className="w-full h-14 rounded-[14px] font-sans font-medium text-base text-[#0F0F0F] bg-white tracking-tight shadow-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 ! opacity-100 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF 0%, #E1E5E8 100%)", color: "#0F0F0F", opacity: 1,
                  boxShadow: "0 4px 14px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.8)",
                }}
              >
                <span>{busy ? "Logging in..." : "Log In"}</span>
                {!busy && <ArrowRight size={16} strokeWidth={2.2} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
