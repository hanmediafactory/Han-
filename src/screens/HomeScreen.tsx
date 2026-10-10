import React from "react";
import {
  ArrowRight,
  Bell,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Sparkles,
  Briefcase,
  Wallet,
  Target,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { today, dateLabel } from "../context/dates";
import { ProgressRing } from "../components/ui/ProgressRing";
import { MoneyCard } from "../components/ui/MoneyCard";
import { ProjectCard } from "../components/ui/ProjectCard";
import { Timeline } from "../components/ui/Timeline";
import { BottomNavigation } from "../components/ui/BottomNavigation";
import { TeamWorkspaceFeed } from "../components/ui/TeamWorkspaceFeed";

export const HomeScreen: React.FC = () => {
  const {
    userProfile,
    executionPercentage,
    tasksLeftTodayCount,
    tasksCompletedTodayCount,
    totalTasksTodayCount,
    dayStreak,
    totalFunds,
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

  // Overdue projects check (deadline strictly before today, progress < 100)
  const overdueProjects = projects.filter(
    (p) => !p.archived && !!p.deadline && p.deadline < today() && p.category !== "Completed",
  );

  // Overdue tasks check (due before today, not completed)
  const overdueTasks = tasks.filter(
    (t) => t.date < today() && t.status !== "COMPLETED" && t.status !== "CANCELLED",
  );

  // Next actionable task
  const nextTask = todayTasks.find((t) => !t.completed) || overdueTasks[0];

  const permittedToggle = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (can('tasks.manage') || task?.assignedUserId === user?.id) {
      toggleTask(id);
    } else {
      showToast("Only the assigned user can update this task.");
    }
  };

  return (
    <div className="w-full h-full bg-[#FAFAFA] flex flex-col justify-between select-none">
      {/* Scrollable Main Area */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6 space-y-4 no-scrollbar">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-black p-1.5 rounded-2xl border border-neutral-800 shadow-md flex items-center justify-center shrink-0">
              <img
                src="/logo.png"
                alt="HAN Media Factory"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-serif text-[11px] font-semibold tracking-widest text-neutral-400 uppercase flex items-center gap-1">
                <Sparkles size={11} className="text-black" /> HAN EXECUTIVE CENTER
              </span>
              <h1 className="font-serif text-2xl font-bold text-black tracking-tight leading-snug mt-0.5">
                {userProfile.greeting} {userProfile.name}.
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <button
              onClick={() => navigateTo("notifications")}
              className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center relative shadow-sm active:scale-95 transition-transform cursor-pointer"
              aria-label="Notifications"
            >
              <Bell size={19} className="text-black" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-black border border-white animate-ping" />
              )}
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => navigateTo("profile")}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-black bg-black text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform font-bold text-sm cursor-pointer"
              aria-label="Profile"
            >
              {userProfile.name.charAt(0)}
            </button>
          </div>
        </div>

        {/* LUXURY EXECUTIVE ACTION STRIP */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {can('tasks.manage') && <button
            onClick={() => navigateTo("tasks", "All", true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Plus size={14} className="text-white" /> + Task
          </button>}
          {can('projects.manage') && <button
            onClick={() => navigateTo("projects", "Active", true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-black text-xs font-semibold shadow-sm hover:border-black active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Briefcase size={14} className="text-black" /> + Project
          </button>}
          {can('finance.manage') && <button
            onClick={() => navigateTo("money", "All", true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-black text-xs font-semibold shadow-sm hover:border-black active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Wallet size={14} className="text-black" /> Log Money
          </button>}
          {can('leads.manage') && <button
            onClick={() => navigateTo("leads", "All", true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-neutral-300 text-black text-xs font-semibold shadow-sm hover:border-black active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Target size={14} className="text-black" /> Add Lead
          </button>}
        </div>

        {/* URGENT OVERDUE ALERT BANNER */}
        {(overdueProjects.length > 0 || overdueTasks.length > 0) && (
          <div className="bg-black text-white p-4 rounded-2xl border border-neutral-800 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-white shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  Attention Needed
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white text-black font-bold">
                    Overdue
                  </span>
                </h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {[overdueProjects.length ? `${overdueProjects.length} overdue project${overdueProjects.length === 1 ? "" : "s"}` : "", overdueTasks.length ? `${overdueTasks.length} overdue task${overdueTasks.length === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigateTo(overdueProjects.length > 0 ? "projects" : "tasks", "Overdue")}
              className="text-xs font-semibold px-3 py-2 bg-white text-black rounded-lg hover:bg-neutral-200 shrink-0 cursor-pointer"
            >
              Review
            </button>
          </div>
        )}

        {/* DIRECT NEXT ACTION FOCUS CARD */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3 animate-fade-in-up stagger-1">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>Primary Focus Action</span>
            <span className="text-black font-mono">{dateLabel(today())}</span>
          </div>

          {nextTask ? (
            <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              <div className="flex items-center gap-3">
                <button
                  aria-label={`Complete ${nextTask.title}`}
                  onClick={() => permittedToggle(nextTask.id)}
                  className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-white hover:bg-black transition"
                >
                  <CheckCircle2 size={16} className="text-black hover:text-white" />
                </button>
                <div>
                  <h4 className="font-bold text-sm text-black">{nextTask.title}</h4>
                  <p className="text-xs text-neutral-500">
                    {nextTask.projectName ? `${nextTask.projectName} · ` : ""}Due {nextTask.date === today() ? "Today" : nextTask.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigateTo("tasks")}
                className="p-2 text-neutral-600 hover:text-black"
                aria-label="View task details"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              <div>
                <h4 className="font-bold text-sm text-black">No pending tasks for today</h4>
                <p className="text-xs text-neutral-500">Schedule your next priority or review projects.</p>
              </div>
              <button
                onClick={() => navigateTo("tasks", "All", can("tasks.manage"))}
                className="flex items-center gap-1 text-xs font-bold bg-black text-white px-3 py-2 rounded-xl"
              >
                <Plus size={14} /> {can("tasks.manage") ? "Add Task" : "View Tasks"}
              </button>
            </div>
          )}
        </div>

        {/* EXECUTION TODAY CARD */}
        {totalTasksTodayCount > 0 && <div
          onClick={() => navigateTo("tasks")}
          className="han-card han-card-clickable p-5 flex items-center justify-between bg-white border border-gray-200 rounded-2xl shadow-sm"
        >
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Execution Today
            </span>
            <h2 className="font-sans text-3xl font-extrabold text-black mt-1">
              {totalTasksTodayCount > 0 ? `${executionPercentage}%` : "No Tasks"}
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              {totalTasksTodayCount > 0
                ? `${tasksCompletedTodayCount} of ${totalTasksTodayCount} tasks done`
                : "No tasks scheduled for today"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {totalTasksTodayCount > 0 ? (
              <ProgressRing
                percentage={executionPercentage}
                size={64}
                strokeWidth={6}
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 font-bold text-xs">
                0/0
              </div>
            )}
            <button
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-black"
              aria-label="View Tasks"
            >
              <ArrowRight size={18} />
            </button>
          </div>
        </div>}

        {/* QUICK METRICS (3 cards grid) */}
        {totalTasksTodayCount > 0 && <div className="grid grid-cols-3 gap-3">
          <div
            onClick={() => navigateTo("tasks")}
            className="han-card han-card-clickable p-3.5 flex flex-col items-center justify-center text-center bg-white border border-gray-200 rounded-2xl"
          >
            <span className="text-2xl font-bold font-sans text-black">
              {tasksLeftTodayCount}
            </span>
            <span className="text-[11px] text-gray-500 font-semibold mt-1">
              Tasks left
            </span>
          </div>

          <div className="han-card p-3.5 flex flex-col items-center justify-center text-center bg-white border border-gray-200 rounded-2xl">
            <div className="flex items-center justify-center gap-1 text-black">
              <span className="text-2xl font-bold font-sans">{dayStreak}</span>
              <Flame size={16} fill="black" />
            </div>
            <span className="text-[11px] text-gray-500 font-semibold mt-1">
              Day streak
            </span>
          </div>

          <div
            onClick={() => navigateTo("calendar")}
            className="han-card han-card-clickable p-3.5 flex flex-col items-center justify-center text-center bg-white border border-gray-200 rounded-2xl"
          >
            <span className="text-xs font-bold font-sans text-black uppercase">
              {dateLabel(today()).split(" ").slice(0, 2).join(" ")}
            </span>
            <span className="text-[11px] text-gray-500 font-semibold mt-1">
              Today
            </span>
          </div>
        </div>

        }
        {/* MONEY CARD */}
        {totalTasksTodayCount > 0 && (
          <MoneyCard amount={totalFunds} onClick={() => navigateTo("money")} />
        )}

        {/* ACTIVE PROJECTS */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-xl font-bold text-black">
              Active Projects
            </h3>
            <button
              onClick={() => navigateTo("projects")}
              className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wider flex items-center gap-1"
            >
              View All <ArrowRight size={12} />
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
            {projects
              .filter((p) => !p.archived && p.category === "Active")
              .map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  layout="horizontal"
                  onClick={() => selectProject(project.id)}
                />
              ))}
            {projects.filter((p) => !p.archived && p.category === "Active").length === 0 && (
              <div className="w-full py-6 text-center text-xs text-neutral-500 bg-white rounded-2xl border border-neutral-200">
                No active projects found.
              </div>
            )}
          </div>
        </div>

        {/* TODAY'S TIMELINE */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-xl font-bold text-black">
              Today's Timeline
            </h3>
            <span className="text-xs font-semibold text-gray-400">
              {dateLabel(today())}
            </span>
          </div>
          <Timeline tasks={todayTasks} onToggleTask={permittedToggle} />
        </div>

        {/* TEAM WORKSPACE SLACK FEED */}
        <TeamWorkspaceFeed />
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onSelectTab={switchTab} />
    </div>
  );
};
