import React, { useState } from "react";
import { Shield, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { entityLabel } from "../../utils/display";

interface AuditLog {
  id?: string;
  table_name?: string;
  record_id?: string;
  action: string;
  timestamp: string;
  created_at?: string;
  entity?: string;
  created_by: string;
}

interface AuditLogStreamProps {
  logs: AuditLog[];
}

export const AuditLogStream: React.FC<AuditLogStreamProps> = ({ logs }) => {
  const app = useApp();
  const [expanded, setExpanded] = useState(false);

  if (!logs || logs.length === 0) return null;

  const displayLogs = expanded ? logs.slice(0, 30) : logs.slice(0, 4);

  return (
    <div className="han-card border border-border-subtle bg-surface/50 space-y-3">
      <button
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-label="Toggle activity history"
      >
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-text-primary" />
          <span className="font-semibold text-sm">Activity history</span>
          <span className="text-[10px] bg-page text-text-primary px-2 py-0.5 rounded-full font-mono">
            {logs.length}
          </span>
        </div>
        <span
          className="p-1 rounded hover:bg-neutral-200 transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      <div className="space-y-2 pt-1">
        {displayLogs.map((log, idx) => (
          <div
            key={log.id || idx}
            className="flex items-center justify-between text-xs p-2 bg-page rounded-lg border border-neutral-100 shadow-2xs"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="font-semibold capitalize text-text-primary">
                {app.state.users.find(user => user.id === log.created_by)?.name || "HAN"}
              </span>
              <span className="text-text-muted font-mono text-[11px] truncate">
                {entityLabel(log.entity || log.table_name || "")} {log.action}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-text-secondary whitespace-nowrap">
              <Clock size={11} />
              {new Date(log.created_at || log.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
      </div>

      {logs.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-center text-xs font-semibold text-text-secondary hover:text-text-primary pt-1"
        >
          {expanded ? "Show less" : `View all ${logs.length} activities`}
        </button>
      )}
    </div>
  );
};
