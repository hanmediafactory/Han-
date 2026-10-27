import React, { useState } from "react";
import { ArrowRight, Check, Target } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { ScreenType } from "../../types";

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
  targetScreen?: ScreenType;
}

interface WorkspaceTargetsWidgetProps {
  filterCategory?: "all" | "tasks" | "finance" | "growth";
  onNavigate?: (screen: ScreenType) => void;
  compact?: boolean;
}

const categories = ["all", "tasks", "finance", "growth"] as const;

export const WorkspaceTargetsWidget: React.FC<WorkspaceTargetsWidgetProps> = ({
  filterCategory = "all",
  onNavigate,
  compact = false,
}) => {
  const app = useApp();
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>(
    filterCategory,
  );

  const tasksCompletedToday = app.tasksCompletedTodayCount;
  const urgentTasksCleared = app.tasks.filter(
    (task) =>
      (task.priority === "HIGH" || task.priority === "URGENT") &&
      task.completed,
  ).length;
  const protectedSavings = app.totalSavings;
  const grossIncome = app.totalIncome;
  const wonLeadsCount = app.state.leads.filter(
    (lead) => lead.status === "Won",
  ).length;
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
        app.tasks.filter(
          (task) => task.priority === "HIGH" || task.priority === "URGENT",
        ).length,
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

  const visibleTargets = liveTargets.filter(
    (target) =>
      activeCategory === "all" || target.category === activeCategory,
  );
  const completedCount = liveTargets.filter(
    (target) => target.currentValue >= target.targetValue,
  ).length;

  return (
    <section
      className="targets-widget"
      data-testid="workspace-targets-widget"
      aria-labelledby="targets-widget-title"
    >
      <header className="targets-widget-header">
        <div className="targets-widget-heading">
          <div className="targets-widget-mark" aria-hidden="true">
            <Target size={17} strokeWidth={1.6} />
          </div>
          <div className="targets-widget-copy">
            <span className="targets-eyebrow">Workspace overview</span>
            <h3 id="targets-widget-title">Targets & milestones</h3>
            <p>
              {completedCount} of {liveTargets.length} targets achieved
            </p>
          </div>
        </div>

        {filterCategory === "all" && (
          <div className="targets-filters" role="group" aria-label="Filter targets">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`targets-filter${activeCategory === category ? " is-active" : ""}`}
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className={`targets-grid${compact ? " is-compact" : ""}`}>
        {visibleTargets.map((target) => {
          const isMet = target.currentValue >= target.targetValue;
          const percentage = Math.min(
            100,
            target.targetValue > 0
              ? Math.round((target.currentValue / target.targetValue) * 100)
              : 0,
          );
          const currentValue = target.isCurrency
            ? rupees(target.currentValue)
            : `${target.currentValue} ${target.unit}`;
          const targetValue = target.isCurrency
            ? rupees(target.targetValue)
            : `${target.targetValue} ${target.unit}`;

          return (
            <button
              key={target.id}
              type="button"
              className={`target-card${isMet ? " is-complete" : ""}`}
              disabled={!onNavigate || !target.targetScreen}
              onClick={() => {
                if (onNavigate && target.targetScreen) {
                  onNavigate(target.targetScreen);
                }
              }}
              aria-label={`${target.title}: ${currentValue}, target ${targetValue}${isMet ? ", achieved" : `, ${percentage}% complete`}`}
            >
              <div className="target-card-topline">
                <span className="target-category">{target.category}</span>
                <span className={`target-progress-label${isMet ? " is-complete" : ""}`}>
                  {isMet ? (
                    <>
                      <Check size={12} strokeWidth={2} /> Achieved
                    </>
                  ) : (
                    `${percentage}%`
                  )}
                </span>
              </div>

              <div className="target-card-title-row">
                <h4>{target.title}</h4>
                <span className="target-card-arrow" aria-hidden="true">
                  <ArrowRight size={15} strokeWidth={1.5} />
                </span>
              </div>
              <p className="target-description">{target.description}</p>

              <div className="target-values">
                <strong>{currentValue}</strong>
                <span>Target {targetValue}</span>
              </div>

              <div
                className="target-progress-track"
                role="progressbar"
                aria-label={`${target.title} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
              >
                <span style={{ width: `${Math.max(percentage > 0 ? 3 : 0, percentage)}%` }} />
              </div>

              <div className="target-card-footer">
                <span>{isMet ? "Milestone complete" : "Progress to target"}</span>
                {onNavigate && target.targetScreen && (
                  <span className="target-open-label">Open {target.targetScreen}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
