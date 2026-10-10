import { useState, useEffect, useCallback } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import { HomeScreen } from "./screens/HomeScreen";
import { Workspace } from "./screens/Workspace";
import { LoginScreen } from "./screens/LoginScreen";
import { Toast } from "./components/ui/Toast";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { WorkspaceStatus } from "./components/ui/WorkspaceStatus";
import { IntroVideoSplash } from "./components/ui/IntroVideoSplash";
import { QuickActionHub } from "./components/ui/QuickActionHub";
import { Bell, X, ArrowRight } from "lucide-react";

function Shell() {
  const app = useApp();
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof navigator !== "undefined" && navigator.webdriver) return false;
    if (
      typeof window !== "undefined" &&
      (window.location.search.includes("skip-intro") ||
        window.location.search.includes("e2e"))
    ) {
      return false;
    }
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("han_intro_shown")) {
      return false;
    }
    return true;
  });

  const handleIntroComplete = useCallback(() => {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("han_intro_shown", "true");
    }
    setShowIntro(false);
  }, []);

  useEffect(() => {
    const replayHandler = () => setShowIntro(true);
    window.addEventListener("han:play-intro", replayHandler);
    return () => window.removeEventListener("han:play-intro", replayHandler);
  }, []);

  return (
    <div className={`han-app min-h-screen bg-page text-text-primary flex flex-col justify-between ${app.user ? "is-authenticated" : ""}`}>
      {showIntro && <IntroVideoSplash onComplete={handleIntroComplete} />}
      {app.user && !app.loading && <WorkspaceStatus />}
      {app.user && !app.loading && <QuickActionHub />}
      {app.state.demo && app.user && <div className="demo-banner">Demo workspace · separate test data</div>}
      {app.loading ? (
        <div className="login-screen flex flex-col items-center justify-center min-h-screen">
          <div className="w-48 py-4 px-6 bg-[#09090B] rounded-2xl border border-border-subtle shadow-xl mb-4 flex items-center justify-center">
            <img
              src="/logo-clean.png"
              alt="HAN Media Factory"
              className="h-10 w-auto object-contain animate-pulse"
            />
          </div>
          <p role="status" className="text-sm text-text-secondary font-mono animate-pulse">
            Opening your workspace…
          </p>
        </div>
      ) : !app.user ? (
        <LoginScreen />
      ) : app.currentScreen === "home" ? (
        <HomeScreen />
      ) : (
        <Workspace key={app.currentScreen} />
      )}

      {(app.connectionError || app.isOffline || app.pendingMutationsCount > 0) && app.user && (
        <div
          role="alert"
          className="fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-surface-overlay border-b border-border-subtle text-xs font-mono flex items-center justify-between text-text-primary shadow-lg animate-fadeIn"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                app.syncing
                  ? "bg-amber-400 animate-ping"
                  : app.isOffline
                    ? "bg-red-400"
                    : "bg-emerald-400"
              }`}
            />
            <span>
              {app.syncing
                ? "Syncing changes with server..."
                : app.isOffline
                  ? `Offline Mode ${app.pendingMutationsCount > 0 ? `(${app.pendingMutationsCount} queued)` : ""}`
                  : app.connectionError || `${app.pendingMutationsCount} pending change(s) — review in You`}
            </span>
          </div>
          {app.connectionError && !app.syncing && (
            <button
              onClick={() => void app.restore()}
              className="underline text-text-primary font-medium hover:text-neutral-200 cursor-pointer"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {app.toast && (
        <div role="status">
          <Toast message={app.toast.message} />
        </div>
      )}

      {app.notificationAlert && app.user && (
        <aside
          className="fixed bottom-36 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-surface-overlay text-text-primary border border-border-subtle p-4 rounded-2xl shadow-2xl z-50 flex items-start gap-3.5 animate-fadeIn"
          role="status"
          aria-label="New notification alert"
        >
          <div className="p-2.5 bg-surface border border-border-strong rounded-xl text-text-primary shrink-0">
            <Bell size={18} className="animate-pulse" />
          </div>
          <button
            className="text-left min-w-0 flex-1 space-y-0.5 cursor-pointer group"
            onClick={() => {
              app.navigateTo(app.notificationAlert!.targetScreen || "notifications");
              app.dismissNotificationAlert();
            }}
          >
            <div className="flex items-center gap-2">
              <b className="block text-sm font-semibold tracking-tight text-text-primary group-hover:text-text-primary transition-colors">
                {app.notificationAlert.title}
              </b>
            </div>
            <p className="text-xs text-text-primary line-clamp-2 leading-relaxed">
              {app.notificationAlert.subtitle}
            </p>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium text-text-primary underline pt-1">
              View update <ArrowRight size={11} />
            </span>
          </button>
          <button
            onClick={app.dismissNotificationAlert}
            aria-label="Dismiss notification alert"
            className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg hover:bg-surface transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </aside>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Shell />
      </AppProvider>
    </ErrorBoundary>
  );
}
