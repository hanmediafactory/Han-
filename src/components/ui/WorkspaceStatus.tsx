import { useApp } from "../../context/AppContext";
export function WorkspaceStatus() {
  const app = useApp();
  return <div className="workspace-status" aria-label="Synchronization status">
    <span className={`status-dot ${app.isOffline ? "offline" : ""}`} />
    <span>{app.syncing ? "Syncing queued changes" : app.isOffline || app.connectionError ? "Saved workspace · connection unavailable" : app.liveConnected ? "Live sync active" : "Checking for updates"}</span>
    <button className="ml-auto underline" disabled={app.busy || app.syncing} onClick={() => { void app.processPendingQueue(); void app.refresh(); }} aria-label="Refresh workspace">Refresh</button>
  </div>;
}
