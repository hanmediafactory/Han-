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
    <div className="w-full h-full bg-[#000000] flex flex-col justify-between select-none">
      {/* Scrollable Main Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-12 pb-6 space-y-5 no-scrollbar">
        {/* Top Header */}
        <div className="pb-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-[#111113] p-1.5 rounded-lg border border-neutral-800 shadow-md flex items-center justify-center shrink-0">
                <img
                  src="/logo-clean.png"
                  alt="HAN"
                  className="w-full h-auto object-contain"
                />
              </div>
              <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-neutral-400 uppercase">
                HAN EXECUTIVE CENTER
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateTo("notifications")}
                className="w-9 h-9 rounded-full bg-[#111113] border border-neutral-800 flex items-center justify-center relative active:scale-95 transition-transform cursor-pointer"
                aria-label="Notifications"
              >
                <Bell size={17} className="text-neutral-400" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white ring-2 ring-black" />
                )}
              </button>
            </div>
          </div>

          {/* Greeting Row */}
          <div className="flex items-start justify-between mt-2">
            <div>
              <p className="text-sm font-sans text-neutral-400">{greeting}</p>
              <div className="flex items-center gap-2.5 mt-0.5">
                <h1 className="font-serif text-3xl font-bold text-white tracking-tight leading-tight">
                  <span className="sr-only">Welcome back, {userProfile.name}.</span>
                  <span aria-hidden="true">{userProfile.name}.</span>
                </h1>
                <span className="text-[10px] font-mono font-semibold tracking-wider text-neutral-300 uppercase px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800">
                  {["user-1", "user-2", "user-3", "user-4"].includes(user?.id || "") ? "FOUNDER" : user?.role || "MEMBER"}
                </span>
              </div>
            </div>

            {/* Date Box */}
            <div className="px-3 py-2 rounded-xl bg-[#111113] border border-neutral-800 text-right shrink-0">
              <p className="text-[11px] font-mono font-bold tracking-wider text-neutral-400 uppercase leading-none">
                {dayName}
              </p>
              <p className="text-[10px] font-mono text-neutral-500 mt-1 leading-none">
                {dateNum} {monthName} {year}
              </p>
            </div>
          </div>
        </div>

        {/* Creation Shortcuts Row */}
        {(can("tasks.manage") || can("projects.manage") || can("finance.manage") || can("leads.manage")) && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
            {can("tasks.manage") && (
              <button
                onClick={() => navigateTo("tasks", "All", true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181C] border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                <Plus size={13} /> + Task
              </button>
            )}
            {can("projects.manage") && (
              <button
                onClick={() => navigateTo("projects", "Active", true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181C] border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                <Plus size={13} /> + Project
              </button>
            )}
            {can("finance.manage") && (
              <button
                onClick={() => navigateTo("money", "All", true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181C] border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                <Plus size={13} /> Log Money
              </button>
            )}
            {can("leads.manage") && (
              <button
                onClick={() => navigateTo("leads", "All", true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181C] border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold shrink-0 cursor-pointer transition-colors"
              >
                <Plus size={13} /> Add Lead
              </button>
            )}
          </div>
        )}

        {/* Overdue Banner */}
        {overdueCount > 0 && (
          <div
            className="w-full relative overflow-hidden bg-gradient-to-r from-[#121215] to-[#18181D] text-white p-5 rounded-2xl border border-neutral-800/80 flex items-center justify-between shadow-xl"
            style={{
              backgroundImage: "radial-gradient(ellipse at 80% 50%, rgba(255,255,255,0.04) 0%, transparent 60%)",
            }}
          >
            <div>
              <p className="font-serif text-3xl font-bold text-white tracking-tight">
                {overdueCount}
              </p>
              <p className="text-xs text-neutral-400 mt-1 font-sans">
                {overdueProjects.length > 0 ? "Overdue Projects" : "Overdue Tasks"}
              </p>
            </div>
            <button
              onClick={() => navigateTo(overdueProjects.length > 0 ? "projects" : "tasks", "Overdue")}
              className="px-3.5 py-2 rounded-xl bg-[#1C1C21] hover:bg-[#25252B] border border-neutral-700/80 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-98 group"
            >
              <span>Review</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

        {/* Today's Focus */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Today's Focus</h3>
            <button
              onClick={() => navigateTo("tasks")}
              className="text-[11px] font-sans font-medium text-neutral-500 hover:text-white transition-colors cursor-pointer"
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
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#111113] border border-neutral-800/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => permittedToggle(task.id)}
                      className="shrink-0 cursor-pointer text-neutral-600 hover:text-white transition-colors"
                      aria-label={`Toggle ${task.title}`}
                    >
                      {task.completed ? (
                        <CheckCircle2 size={19} className="text-white" />
                      ) : (
                        <Circle size={19} className="text-neutral-500" />
                      )}
                    </button>
                    <p className={`text-xs font-medium truncate ${task.completed ? "line-through text-neutral-500" : "text-neutral-200"}`}>
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
              <p className="text-xs text-neutral-500 py-3 text-center">No tasks scheduled for today.</p>
            )}
          </div>

          {can("tasks.manage") && (
            <button
              onClick={() => navigateTo("tasks", "All", true)}
              className="w-full mt-2.5 py-2.5 px-4 rounded-xl bg-[#111113] border border-neutral-800/80 hover:border-neutral-700 text-xs font-medium text-neutral-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={15} /> Add Task
            </button>
          )}
        </div>

        {/* Active Projects */}
        <div className="px-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white tracking-tight">Active Projects</h3>
            <button
              onClick={() => navigateTo("projects")}
              className="text-[11px] font-sans font-medium text-neutral-500 hover:text-white transition-colors cursor-pointer"
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
                  className="w-full p-3.5 rounded-2xl bg-[#111113] border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer flex items-center justify-between gap-3 group text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#19191D] border border-neutral-800 flex items-center justify-center shrink-0">
                    <Folder size={18} className="text-neutral-400 group-hover:text-white transition-colors" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-xs text-white truncate">{project.name}</h4>
                      {isOverdue && (
                        <span className="badge-overdue shrink-0">Overdue</span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">{project.subtitle || "Creative project"}</p>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="flex-1 h-1 bg-[#1F1F24] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-neutral-400 shrink-0">{project.progress}%</span>
                    </div>
                  </div>

                  <div className="text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0">
                    <ArrowRight size={16} />
                  </div>
                </div>
              );
            }) : (
              <div className="py-6 text-center text-xs text-neutral-500 bg-[#111113] rounded-2xl border border-neutral-800">
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
