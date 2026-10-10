import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { Sparkles, ShieldCheck, CheckCircle2, Zap } from "lucide-react";

export function WelcomeSplash({ onComplete }: { onComplete?: () => void }) {
  const app = useApp();
  const [visible, setVisible] = useState(true);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Sequence steps
    const timer1 = setTimeout(() => setStep(1), 400);
    const timer2 = setTimeout(() => setStep(2), 1200);
    const timer3 = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  if (!visible || !app.user) return null;

  const roleTitle = ["user-1", "user-2", "user-3", "user-4"].includes(app.user.id) || app.user.role === "OWNER" ? "Founder & Workspace Admin" : "Team Member";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/95 backdrop-blur-2xl text-white transition-opacity duration-700 animate-fadeIn"
      style={{
        backgroundImage: `
          radial-gradient(circle at 50% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 60%),
          radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.04) 0%, transparent 50%)
        `,
      }}
    >
      <div className="relative w-full max-w-sm mx-auto text-center space-y-6">
        {/* Glowing Brand Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="w-24 h-24 rounded-3xl bg-[#09090B] border border-neutral-700 shadow-2xl flex items-center justify-center p-3 transform transition-all duration-500 hover:scale-105 overflow-hidden">
            <img
              src="/logo-clean.png"
              alt="HAN Media Factory"
              className="w-full h-auto object-contain drop-shadow-lg"
            />
          </div>
          <div className="absolute -top-1 -right-1 p-1.5 bg-white text-black rounded-full shadow-lg animate-bounce">
            <Sparkles size={14} className="fill-black" />
          </div>
        </div>

        {/* Dynamic Greeting Text */}
        <div className="space-y-2">
          <p className="text-xs font-mono tracking-widest uppercase text-neutral-300 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Command Center Active
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white">
            Welcome, {app.user.name}
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-xs text-neutral-300">
            <ShieldCheck size={13} className="text-white" />
            <span>{roleTitle}</span>
          </div>
        </div>

        {/* Sync Status Info */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 text-left space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>SYNCHRONIZATION</span>
            <span className="text-white flex items-center gap-1">
              <CheckCircle2 size={12} /> Ready
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-white" />
              <span>Real-time work assignment engine active</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={12} className="text-white" />
              <span>
                {app.state.projects.length} project(s) & {app.tasks.length} task(s) synced
              </span>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full bg-neutral-800 rounded-full h-1 overflow-hidden mt-3">
            <div
              className="bg-white h-full transition-all duration-1000 ease-out"
              style={{ width: step === 0 ? "20%" : step === 1 ? "75%" : "100%" }}
            />
          </div>
        </div>

        {/* Quick Skip Button */}
        <button
          onClick={() => {
            setVisible(false);
            onComplete?.();
          }}
          className="text-xs text-neutral-400 hover:text-white transition-colors underline pt-2 cursor-pointer"
        >
          Skip intro →
        </button>
      </div>
    </div>
  );
}
