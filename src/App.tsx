import { AppProvider, useApp } from "./context/AppContext";
import { HomeScreen } from "./screens/HomeScreen";
import { Workspace } from "./screens/Workspace";
import { LoginScreen } from "./screens/LoginScreen";
import { Toast } from "./components/ui/Toast";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { WorkspaceStatus } from "./components/ui/WorkspaceStatus";

function Shell() {
  const app = useApp();

  return (
    <div className="han-app min-h-screen bg-[#FAFAFA] text-[#0F0F0F] flex flex-col justify-between">
      {app.user && !app.loading && <WorkspaceStatus />}
      {app.state.demo && app.user && <div className="demo-banner">Demo workspace · separate test data</div>}
      {app.loading ? (
        <div className="login-screen flex flex-col items-center justify-center min-h-screen">
          <h1 className="font-serif text-5xl tracking-widest mb-3">HAN</h1>
          <p role="status" className="text-sm text-neutral-400 font-mono animate-pulse">
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
          className="fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-neutral-900 border-b border-neutral-800 text-xs font-mono flex items-center justify-between text-neutral-300 shadow-lg animate-fadeIn"
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
              className="underline text-white font-medium hover:text-neutral-200"
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
      {app.notificationAlert && app.user && <aside className="notification-alert" role="status" aria-label="New notification alert">
        <button className="text-left min-w-0" onClick={() => { app.navigateTo(app.notificationAlert!.targetScreen || "notifications"); app.dismissNotificationAlert(); }}><b className="block text-sm">{app.notificationAlert.title}</b><span className="text-xs text-neutral-600">{app.notificationAlert.subtitle}</span><span className="block text-xs underline mt-1">View update</span></button>
        <button onClick={app.dismissNotificationAlert} aria-label="Dismiss notification alert" className="min-h-11 px-3">×</button>
      </aside>}
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
