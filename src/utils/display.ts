export const entityLabel = (name: string) => ({ projects: "Project", tasks: "Task", income: "Income", expenses: "Expense", savings_entries: "Savings transfer", salary_payments: "Salary payment", leads: "Lead", funnels: "Funnel", users: "Account", calendar_events: "Calendar event", team_members: "Team profile", categories: "Category", settings: "Workspace note" }[name] || "Workspace");

export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (diffMs < 0) return "Just now";
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 45) return "Just now";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function formatTaskAudit(task: {
  progress?: number;
  completed?: boolean;
  completedByName?: string | null;
  progressUpdatedByName?: string | null;
  lastUpdatedByName?: string | null;
  progressUpdatedAt?: string | null;
  completedAt?: string | null;
  lastUpdatedAt?: string | null;
  updated_at?: string | null;
}): { text: string; time: string; updater: string } | null {
  const progress = task.progress !== undefined ? task.progress : (task.completed ? 100 : 0);
  const timeStr = task.progressUpdatedAt || task.completedAt || task.lastUpdatedAt || task.updated_at;
  const time = formatRelativeTime(timeStr);
  const updater =
    (progress === 100 || task.completed) && task.completedByName
      ? task.completedByName
      : (task.progressUpdatedByName || task.lastUpdatedByName || "Team member");

  if (progress === 100 || task.completed) {
    return {
      text: `Completed by ${updater}`,
      time,
      updater,
    };
  }

  if (progress > 0) {
    return {
      text: `${progress}% set by ${updater}`,
      time,
      updater,
    };
  }

  if (task.progressUpdatedByName || task.lastUpdatedByName) {
    return {
      text: `Updated by ${updater}`,
      time,
      updater,
    };
  }

  return null;
}

