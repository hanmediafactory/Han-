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
      <div className="glass-card-dark p-4 rounded-3xl border border-neutral-800 shadow-2xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 text-white flex items-center justify-center border border-neutral-700">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                #workspace-feed <span className="slack-badge bg-neutral-800 text-white border border-neutral-700 font-mono text-[10px]">Live Stream</span>
              </h3>
              <p className="text-[11px] text-neutral-400">Shared multi-user workspace & notifications</p>
            </div>
          </div>
          <button
            onClick={() => void refresh()}
            className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
                    ? "bg-white text-black border-white"
                    : "bg-neutral-900 border-neutral-800 text-neutral-300"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelf ? "bg-black text-white" : "bg-neutral-800 text-white"
                  }`}>
                    {member.name.charAt(0)}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${
                    isSelf ? "bg-black" : "bg-white"
                  } animate-pulse`} />
                </div>
                <span>{member.name}</span>
                {member.role === "OWNER" && (
                  <span title="Owner"><Shield size={10} className={isSelf ? "text-black" : "text-white"} /></span>
                )}
                {isSelf && <span className="text-[9px] font-mono text-black uppercase font-bold">(You)</span>}
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
            className="flex-1 bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 text-xs rounded-2xl px-3.5 py-2.5 outline-none focus:border-white transition-colors"
          />
          <button
            type="submit"
            disabled={posting || !announcement.trim()}
            className="px-4 py-2.5 bg-white text-black font-bold text-xs rounded-2xl flex items-center gap-1.5 hover:bg-neutral-200 active:scale-95 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
          >
            <Send size={13} /> Send
          </button>
        </form>
      </div>

      {/* Live Action Activity Feed */}
      <div className="glass-card p-4 rounded-3xl border border-neutral-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-serif text-sm font-bold text-neutral-900 flex items-center gap-1.5">
            <Users size={15} className="text-neutral-500" /> Recent Team Operations
          </h4>
          <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase">
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
                className="flex items-start gap-3 p-2.5 rounded-2xl bg-neutral-50/80 border border-neutral-200/60 hover:border-neutral-300 transition-all text-xs"
              >
                <div className="w-8 h-8 rounded-xl bg-black text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                  {author.initial}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 flex items-center gap-1">
                      {author.name}
                      {author.role === "OWNER" && (
                        <span className="text-[9px] bg-black text-white font-mono font-bold px-1.5 py-0.5 rounded-md">
                          OWNER
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-0.5">
                      <Clock size={10} /> {dateStr}
                    </span>
                  </div>

                  <p className="text-neutral-600 mt-0.5 flex items-center gap-1.5">
                    {getEntityIcon(String(log.entity))}
                    <span className="capitalize font-semibold text-neutral-800">
                      {String(log.action)}
                    </span>
                    <span className="text-neutral-400">·</span>
                    <span className="text-neutral-500 truncate">{entityLabel(String(log.entity))}</span>
                  </p>
                </div>
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="text-center py-6 text-xs text-neutral-400">
              No recent activity recorded yet. Team actions will appear live here!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
