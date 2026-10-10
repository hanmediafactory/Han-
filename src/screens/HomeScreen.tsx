import React from "react";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Plus,
  Circle,
  Folder,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { today } from "../context/dates";
import { BottomNavigation } from "../components/ui/BottomNavigation";

export const HomeScreen: React.FC = () => {
  const {
    userProfile,
    projects,
    tasks,
    activeTab,
    switchTab,
    navigateTo,
    selectProject,
    toggleTask,
    unreadNotificationCount,
    user,
    showToast,
    can,
  } = useApp();

  const todayTasks = tasks.filter(
    (t) => t.date === today() && t.status !== "CANCELLED",
  );

  const overdueProjects = projects.filter(
    (p) => !p.archived && !!p.deadline && p.deadline < today() && p.category !== "Completed",
  );

  const overdueTasks = tasks.filter(
    (t) => t.date < today() && t.status !== "COMPLETED" && t.status !== "CANCELLED",
  );

  const permittedToggle = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (can('tasks.manage') || task?.assignedUserId === user?.id) {
      toggleTask(id);
    } else {
      showToast("Only the assigned user can update this task.");
    }
  };

  const [todayDate] = React.useState(() => new Date());
  const hour = todayDate.getHours();
  const greeting = hour < 12 ? "Good morning," : hour < 17 ? "Good afternoon," : "Good evening,";

  const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const dayName = dayNames[todayDate.getDay()];
  const dateNum = todayDate.getDate();
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const monthName = monthNames[todayDate.getMonth()];
  const year = todayDate.getFullYear();

  // Focus tasks — overdue first, then today, max 3
  const focusTasks = [
    ...overdueTasks.slice(0, 2),
    ...todayTasks.filter(t => !t.completed).slice(0, 3 - Math.min(overdueTasks.length, 2)),
  ].slice(0, 3);

  const activeProjects = projects.filter((p) => !p.archived && p.category === "Active");
  const overdueCount = overdueProjects.length > 0 ? overdueProjects.length : overdueTasks.length;

  return (
    <div className="home-page w-full h-full bg-page flex flex-col justify-between select-none">
      {/* Scrollable Main Area */}
      <div className="home-content flex-1 overflow-y-auto px-5 pt-12 pb-6 space-y-5 no-scrollbar">
        {/* Top Header */}
        <div className="home-introduction pb-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-surface-elevated p-1.5 rounded-lg border border-border-subtle shadow-md flex items-center justify-center shrink-0">
                <img
                  src="/logo-clean.png"
                  alt="HAN"
                  className="w-full h-auto object-contain"
                />
              </div>
              <span className="home-brand text-[10px] font-mono font-bold tracking-[0.2em] text-text-secondary uppercase">
                HAN MEDIA FACTORY
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateTo("notifications")}
                className="w-9 h-9 rounded-full bg-surface-elevated border border-border-subtle flex items-center justify-center relative active:scale-95 transition-transform cursor-pointer"
                aria-label="Notifications"
              >
                <Bell size={17} className="text-text-secondary" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-page ring-2 ring-black" />
                )}
              </button>
            </div>
          </div>

          {/* Greeting Row */}
          <div className="flex items-start justify-between mt-2">
            <div>
              <p className="text-sm font-sans text-text-secondary">{greeting}</p>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="home-title font-serif text-3xl font-bold text-text-primary tracking-tight leading-tight">
                  <span className="sr-only">Welcome back, {userProfile.name}.</span>
                  <span aria-hidden="true">{userProfile.name}.</span>
                </h1>
                <span className="text-[10px] font-mono font-semibold tracking-wider text-text-primary uppercase px-2 py-0.5 rounded bg-surface border border-border-subtle">
                  {["user-1", "user-2", "user-3", "user-4"].includes(user?.id || "") ? "FOUNDER" : user?.role || "MEMBER"}
                </span>
              </div>
            </div>

            {/* Date Box */}
            <div className="home-date px-3 py-2 rounded-xl bg-surface-elevated border border-border-subtle text-right shrink-0">
              <p className="text-[11px] font-mono font-bold tracking-wider text-text-secondary uppercase leading-none">
                {dayName}
              </p>
              <p className="text-[10px] font-mono text-text-muted mt-1 leading-none">
                {dateNum} {monthName} {year}
              </p>
            </div>
          </div>
        </div>

        {/* Creation Shortcuts Row */}
        {(can("tasks.manage") || can("projects.manage") || can("finance.manage") || can("leads.manage")) && (
          <div className="home-shortcuts flex gap-2 overflow-x-auto no-scrollbar py-0.5">
            {can("tasks.manage") && (
              <button
                onClick={() => navigateTo("tasks", "All", true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-overlay border border-border-subtle hover:border-border-strong text-text-primary hover:text-text-primary text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                <Plus size={13} /> + Task
              </button>
            )}
            {can("projects.manage") && (
              <button
                onClick={() => navigateTo("projects", "Active", true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-overlay border border-border-subtle hover:border-border-strong text-text-primary hover:text-text-primary text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                <Plus size={13} /> + Project
              </button>
            )}
            {can("finance.manage") && (
              <button
                onClick={() => navigateTo("money", "All", true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-overlay border border-border-subtle hover:border-border-strong text-text-primary hover:text-text-primary text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                <Plus size={13} /> Log Money
              </button>
            )}
            {can("leads.manage") && (
              <button
                onClick={() => navigateTo("leads", "All", true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-overlay border border-border-subtle hover:border-border-strong text-text-primary hover:text-text-primary text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                <Plus size={13} /> Add Lead
              </button>
            )}
          </div>
        )}

        <section className="workspace-summary" aria-label="Workspace at a glance">
          <div><span>Active projects</span><strong>{activeProjects.length}</strong><small>In motion</small></div>
          <div><span>Open tasks</span><strong>{tasks.filter(task => !task.completed && task.status !== "CANCELLED").length}</strong><small>To move forward</small></div>
          <div><span>Done today</span><strong>{todayTasks.filter(task => task.completed).length}</strong><small>Of {todayTasks.length} scheduled</small></div>
        </section>

        {/* Overdue Banner */}
        {overdueCount > 0 && (
          <div
            className="overdue-summary w-full relative overflow-hidden bg-surface-elevated text-text-primary p-5 rounded-2xl border border-border-subtle flex items-center justify-between shadow-sm"
          >
            <div>
              <p className="font-serif text-3xl font-bold text-text-primary tracking-tight">
                {overdueCount}
              </p>
              <p className="text-xs text-text-secondary mt-1 font-sans">
                {overdueProjects.length > 0 ? "Overdue Projects" : "Overdue Tasks"}
              </p>
            </div>
            <button
              onClick={() => navigateTo(overdueProjects.length > 0 ? "projects" : "tasks", "Overdue")}
              className="px-3.5 py-2 rounded-xl bg-surface hover:bg-surface-overlay border border-border-strong/80 text-xs font-semibold text-text-primary flex items-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-98 group"
            >
              <span>Review</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Today's Focus */}
        <div className="home-focus">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-text-primary tracking-tight">Today's Focus</h3>
            <button
              onClick={() => navigateTo("tasks")}
              className="text-[11px] font-sans font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-1.5">
            {focusTasks.length > 0 ? focusTasks.map((task) => {
              const isOverdue = task.date < today();
              const isToday = task.date === today();
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-surface-elevated border border-border-subtle/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => permittedToggle(task.id)}
                      className="shrink-0 cursor-pointer text-text-secondary hover:text-text-primary transition-colors"
                      aria-label={`Toggle ${task.title}`}
                    >
                      {task.completed ? (
                        <CheckCircle2 size={19} className="text-text-primary" />
                      ) : (
                        <Circle size={19} className="text-text-muted" />
                      )}
                    </button>
                    <p className={`text-xs font-medium truncate ${task.completed ? "line-through text-text-muted" : "text-text-primary"}`}>
                      {task.title}
                    </p>
                  </div>
                  {isOverdue && (
                    <span className="badge-overdue ml-2 shrink-0">Overdue</span>
                  )}
                  {isToday && !isOverdue && (
                    <span className="badge-today ml-2 shrink-0">Today</span>
                  )}
                </div>
              );
            }) : (
              <div className="focus-empty"><CheckCircle2 size={24} strokeWidth={1.4} /><p>Your day has room.</p><span>No tasks scheduled for today.</span></div>
            )}
          </div>

          {can("tasks.manage") && (
            <button
              onClick={() => navigateTo("tasks", "All", true)}
              className="w-full mt-2.5 py-2.5 px-4 rounded-xl bg-surface-elevated border border-border-subtle hover:border-border-strong text-xs font-medium text-text-primary hover:text-text-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={15} /> Add Task
            </button>
          )}
        </div>

        {/* Active Projects */}
        <div className="home-projects mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-text-primary tracking-tight">Active Projects</h3>
            <button
              onClick={() => navigateTo("projects")}
              className="text-[11px] font-sans font-medium text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5">
            {activeProjects.length > 0 ? activeProjects.slice(0, 3).map((project) => {
              const isOverdue = !!project.deadline && project.deadline < today() && project.progress < 100;
              return (
                <div
                  key={project.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Project: ${project.name}, Progress: ${project.progress} percent`}
                  onClick={() => selectProject(project.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectProject(project.id);
                    }
                  }}
                  className="w-full p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong transition-all cursor-pointer flex items-center justify-between gap-3 group text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle flex items-center justify-center shrink-0">
                    <Folder size={18} className="text-text-secondary group-hover:text-text-primary transition-colors" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-text-primary truncate">{project.name}</h4>
                      {isOverdue && (
                        <span className="badge-overdue shrink-0">Overdue</span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted truncate mt-0.5">{project.subtitle || "Creative project"}</p>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="flex-1 h-1 bg-surface-overlay rounded-full overflow-hidden">
                        <div
                          className="h-full bg-text-primary rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-text-secondary shrink-0">{project.progress}%</span>
                    </div>
                  </div>

                  <div className="text-text-secondary group-hover:text-text-secondary transition-colors shrink-0">
                    <ArrowRight size={16} />
                  </div>
                </div>
              );
            }) : (
              <div className="py-6 text-center text-xs text-text-muted bg-surface-elevated rounded-2xl border border-border-subtle">
                No active projects.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onSelectTab={switchTab} />
    </div>
  );
};
