import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { entityLabel } from "../../utils/display";
import {
  MessageSquare,
  Users,
  Send,
  Sparkles,
  Shield,
  Clock,
  CheckCircle2,
  Briefcase,
  Wallet,
  Target,
  RefreshCw,
} from "lucide-react";

export const TeamWorkspaceFeed: React.FC = () => {
  const { state, user, request, refresh, showToast } = useApp();
  const [announcement, setAnnouncement] = useState("");
  const [posting, setPosting] = useState(false);

  const teamMembers = state.users.filter((u) => u.active);
  const logs = state.activity_logs.filter((l) => l.entity !== "notifications");

  const getMemberDetails = (userId: string) => {
    const found = teamMembers.find((u) => u.id === userId);
    return {
      id: found?.id || userId,
      name: found?.name || userId,
      role: found?.role || "MEMBER",
      initial: (found?.name || "U").charAt(0).toUpperCase(),
    };
  };

  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.trim()) return;
    setPosting(true);

    try {
      // Send workspace notification to all team members
      for (const member of teamMembers) {
        await request("notifications", "POST", {
          title: `Team Update from ${user?.name || "Member"} 💬`,
          subtitle: announcement.trim(),
          userId: member.id,
          category: "General",
          iconType: "team",
          targetScreen: "home",
        });
      }
      showToast("Broadcasted team announcement to all members!");
      setAnnouncement("");
      await refresh();
    } catch (err) {
      showToast((err as Error).message || "Failed to post team update.");
    } finally {
      setPosting(false);
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case "tasks":
        return <CheckCircle2 size={14} className="text-neutral-700" />;
      case "projects":
        return <Briefcase size={14} className="text-neutral-700" />;
      case "expenses":
      case "income":
      case "salary_payments":
        return <Wallet size={14} className="text-neutral-700" />;
      case "leads":
        return <Target size={14} className="text-neutral-700" />;
      default:
        return <Sparkles size={14} className="text-neutral-700" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Glassmorphic Header & Team Presence Strip */}
      <div className="glass-card-dark p-4 rounded-3xl border border-border-subtle shadow-2xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 text-text-primary flex items-center justify-center border border-border-strong">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                #workspace-feed <span className="slack-badge bg-neutral-800 text-text-primary border border-border-strong font-mono text-[10px]">Live Stream</span>
              </h3>
              <p className="text-[11px] text-text-secondary">Shared multi-user workspace & notifications</p>
            </div>
          </div>
          <button
            onClick={() => void refresh()}
            className="p-2 rounded-xl bg-neutral-900 border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Sync Live Stream"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Team Members Active Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {teamMembers.map((member) => {
            const isSelf = member.id === user?.id;
            return (
              <div
                key={member.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shrink-0 transition-all ${
                  isSelf
                    ? "bg-page text-text-primary border-white"
                    : "bg-neutral-900 border-border-subtle text-text-primary"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelf ? "bg-page text-text-primary" : "bg-neutral-800 text-text-primary"
                  }`}>
                    {member.name.charAt(0)}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                    isSelf ? "bg-page" : "bg-page"
                  } animate-pulse`} />
                </div>
                <span>{member.name}</span>
                {(member.role === "OWNER" || ["user-1", "user-2", "user-3", "user-4"].includes(member.id)) && (
                  <span title="Founder"><Shield size={10} className={isSelf ? "text-text-primary" : "text-text-primary"} /></span>
                )}
                {isSelf && <span className="text-[9px] font-mono text-text-primary uppercase font-bold">(You)</span>}
              </div>
            );
          })}
        </div>

        {/* Post Quick Announcement Form */}
        <form onSubmit={handlePostNote} className="flex gap-2 pt-1">
          <input
            type="text"
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            placeholder={`Broadcast message as ${user?.name || "User"}...`}
            className="flex-1 bg-neutral-900 border border-border-subtle text-text-primary placeholder-neutral-500 text-xs rounded-2xl px-3.5 py-2.5 outline-none focus:border-white transition-colors"
          />
          <button
            type="submit"
            disabled={posting || !announcement.trim()}
            className="px-4 py-2.5 bg-page text-text-primary font-bold text-xs rounded-2xl flex items-center gap-1.5 hover:bg-neutral-200 active:scale-95 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
          >
            <Send size={13} /> Send
          </button>
        </form>
      </div>

      {/* Live Action Activity Feed */}
      <div className="glass-card p-4 rounded-3xl border border-border-subtle/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-serif text-sm font-bold text-text-primary flex items-center gap-1.5">
            <Users size={15} className="text-text-muted" /> Recent Team Operations
          </h4>
          <span className="text-[10px] font-mono font-bold text-text-secondary uppercase">
            {logs.length} Live Records
          </span>
        </div>

        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 no-scrollbar">
          {logs.slice(0, 15).map((log, index) => {
            const author = getMemberDetails(String(log.created_by || "user-1"));
            const dateStr = log.created_at
              ? new Date(String(log.created_at)).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Just now";

            return (
              <div
                key={String(log.id || `feed-log-${index}`)}
                className="flex items-start gap-3 p-2.5 rounded-2xl bg-surface/80 border border-border-subtle/60 hover:border-neutral-300 transition-all text-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-page text-text-primary font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  {author.initial}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-text-primary flex items-center gap-1">
                      {author.name}
                      {(author.role === "OWNER" || ["user-1", "user-2", "user-3", "user-4"].includes(author.id)) && (
                        <span className="text-[9px] bg-page text-text-primary font-mono font-bold px-1.5 py-0.5 rounded-md">
                          FOUNDER
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-text-secondary flex items-center gap-0.5">
                      <Clock size={10} /> {dateStr}
                    </span>
                  </div>

                  <p className="text-text-secondary mt-0.5 flex items-center gap-1.5">
                    {getEntityIcon(String(log.entity))}
                    <span className="capitalize font-semibold text-text-primary">
                      {String(log.action)}
                    </span>
                    <span className="text-text-secondary">·</span>
                    <span className="text-text-muted truncate">{entityLabel(String(log.entity))}</span>
                  </p>
                </div>
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="text-center py-6 text-xs text-text-secondary">
              No recent activity recorded yet. Team actions will appear live here!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
