import React, { useState } from "react";
import {
  Target,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

const rupees = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export interface TargetItem {
  id: string;
  category: "tasks" | "finance" | "growth";
  title: string;
  description: string;
  currentValue: number;
  targetValue: number;
  unit: string;
  isCurrency?: boolean;
  targetScreen?: string;
}

interface WorkspaceTargetsWidgetProps {
  filterCategory?: "all" | "tasks" | "finance" | "growth";
  onNavigate?: (screen: any) => void;
  compact?: boolean;
}

export const WorkspaceTargetsWidget: React.FC<WorkspaceTargetsWidgetProps> = ({
  filterCategory = "all",
  onNavigate,
  compact = false,
}) => {
  const app = useApp();
  const [activeCategory, setActiveCategory] = useState<"all" | "tasks" | "finance" | "growth">(
    filterCategory,
  );

  // Compute live current values dynamically from app state
  const tasksCompletedToday = app.tasksCompletedTodayCount;
  const urgentTasksCleared = app.tasks.filter(
    (t) => (t.priority === "HIGH" || t.priority === "URGENT") && t.completed,
  ).length;
  const protectedSavings = app.totalSavings;
  const grossIncome = app.totalIncome;
  const wonLeadsCount = app.state.leads.filter((l) => l.status === "Won").length;
  const totalLeadsCount = app.state.leads.length;

  const liveTargets: TargetItem[] = [
    {
      id: "target-tasks-daily",
      category: "tasks",
      title: "Daily Tasks Cleared",
      description: "Complete your committed sprint tasks for today.",
      currentValue: tasksCompletedToday,
      targetValue: Math.max(5, app.totalTasksTodayCount),
      unit: "tasks",
      targetScreen: "tasks",
    },
    {
      id: "target-tasks-urgent",
      category: "tasks",
      title: "Clear Urgent & High Priority",
      description: "Resolve all high-friction tasks before day end.",
      currentValue: urgentTasksCleared,
      targetValue: Math.max(
        1,
        app.tasks.filter((t) => t.priority === "HIGH" || t.priority === "URGENT").length,
      ),
      unit: "tasks",
      targetScreen: "tasks",
    },
    {
      id: "target-finance-savings",
      category: "finance",
      title: "Runway Reserve Goal",
      description: "Protected savings ringfenced into the stability vault.",
      currentValue: protectedSavings,
      targetValue: 250000,
      unit: "₹",
      isCurrency: true,
      targetScreen: "money",
    },
    {
      id: "target-finance-revenue",
      category: "finance",
      title: "Monthly Revenue Target",
      description: "Achieve monthly client payments and commercial cashflow.",
      currentValue: grossIncome,
      targetValue: 100000,
      unit: "₹",
      isCurrency: true,
      targetScreen: "money",
    },
    {
      id: "target-growth-won",
      category: "growth",
      title: "Deals Closed / Converted Clients",
      description: "Close high-ticket leads into paying HAN clients.",
      currentValue: wonLeadsCount,
      targetValue: 3,
      unit: "clients",
      targetScreen: "leads",
    },
    {
      id: "target-growth-leads",
      category: "growth",
      title: "Pipeline Lead Generation",
      description: "Expand pipeline volume across commercial channels.",
      currentValue: totalLeadsCount,
      targetValue: 10,
      unit: "leads",
      targetScreen: "leads",
    },
  ];

  const visibleTargets = liveTargets.filter((t) =>
    activeCategory === "all" ? true : t.category === activeCategory,
  );

  const completedCount = liveTargets.filter((t) => t.currentValue >= t.targetValue).length;

  return (
    <div className="space-y-3.5 select-none" data-testid="workspace-targets-widget">
      {/* Header & Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-surface-overlay border border-border-subtle flex items-center justify-center text-emerald-400">
            <Target size={16} />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-text-primary tracking-tight">
              Targets & Milestones to Achieve
            </h3>
            <p className="text-[10px] font-mono text-text-muted">
              {completedCount} of {liveTargets.length} Targets Achieved
            </p>
          </div>
        </div>

        {filterCategory === "all" && (
          <div className="flex gap-1 bg-surface-overlay p-1 rounded-xl border border-border-subtle">
            {(["all", "tasks", "finance", "growth"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-page text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Target Cards Grid */}
      <div className={`grid gap-2.5 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {visibleTargets.map((target) => {
          const isMet = target.currentValue >= target.targetValue;
          const pct = Math.min(
            100,
            target.targetValue > 0
              ? Math.round((target.currentValue / target.targetValue) * 100)
              : 0,
          );

          const badgeColor =
            target.category === "finance"
              ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/60"
              : target.category === "tasks"
                ? "text-cyan-400 bg-cyan-950/40 border-cyan-800/60"
                : "text-purple-400 bg-purple-950/40 border-purple-800/60";

          return (
            <div
              key={target.id}
              onClick={() => {
                if (onNavigate && target.targetScreen) {
                  onNavigate(target.targetScreen);
                }
              }}
              className={`p-3.5 rounded-2xl bg-surface-elevated border transition-all ${
                onNavigate ? "cursor-pointer" : ""
              } ${
                isMet
                  ? "border-emerald-800/80 bg-gradient-to-br from-surface-elevated to-emerald-950/20"
                  : "border-border-subtle hover:border-border-strong"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border ${badgeColor}`}
                    >
                      {target.category}
                    </span>
                    <h4 className="font-bold text-xs text-text-primary">{target.title}</h4>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">{target.description}</p>
                </div>

                {isMet ? (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-700/60 px-2 py-0.5 rounded-full shrink-0">
                    <CheckCircle2 size={12} /> Achieved
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-text-muted bg-surface px-2 py-0.5 rounded-full border border-border-subtle shrink-0">
                    {pct}%
                  </span>
                )}
              </div>

              {/* Progress Bar & Numerical Metrics */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-text-primary font-bold">
                    {target.isCurrency
                      ? rupees(target.currentValue)
                      : `${target.currentValue} ${target.unit}`}
                  </span>
                  <span className="text-text-muted text-[10px]">
                    Target:{" "}
                    {target.isCurrency
                      ? rupees(target.targetValue)
                      : `${target.targetValue} ${target.unit}`}
                  </span>
                </div>

                <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border-subtle">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isMet
                        ? "bg-emerald-400"
                        : target.category === "finance"
                          ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                          : target.category === "tasks"
                            ? "bg-gradient-to-r from-cyan-500 to-blue-400"
                            : "bg-gradient-to-r from-purple-500 to-pink-400"
                    }`}
                    style={{ width: `${Math.max(3, pct)}%` }}
                  />
                </div>
              </div>

              {onNavigate && (
                <div className="mt-2 pt-1.5 border-t border-border-subtle/40 flex justify-end">
                  <span className="text-[10px] font-mono text-text-muted hover:text-text-primary flex items-center gap-1">
                    <span>Open {target.targetScreen}</span>
                    <ArrowRight size={10} />
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
