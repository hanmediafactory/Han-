import React, { useState, useMemo } from "react";
import { useDialogFocus } from "./useDialogFocus";
import { useApp } from "../../context/AppContext";
import {
  Search,
  CheckCircle2,
  Briefcase,
  Wallet,
  Target,
  Plus,
  ArrowRight,
  X,
  Command,
  Sparkles,
} from "lucide-react";

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
}) => {
  const app = useApp();
  const [query, setQuery] = useState("");
  const panel = useDialogFocus(isOpen, onClose);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();

    const appActions = [
      {
        type: "action",
        id: "action-new-task",
        title: "New Task",
        subtitle: "Action · Create & assign work",
        target: "tasks",
        filter: "All",
        create: true,
        permission: "tasks.manage",
        keywords: ["new task", "create task", "add task", "todo", "task", "work"],
      },
      {
        type: "action",
        id: "action-new-project",
        title: "New Project",
        subtitle: "Action · Launch new project roadmap",
        target: "projects",
        filter: "Active",
        create: true,
        permission: "projects.manage",
        keywords: ["new project", "create project", "add project", "roadmap", "project"],
      },
      {
        type: "action",
        id: "action-new-expense",
        title: "Log Finance / Expense",
        subtitle: "Action · Record transaction",
        target: "money",
        filter: "All",
        create: true,
        permission: "finance.manage",
        keywords: ["new expense", "log expense", "add expense", "finance", "money", "transaction", "income"],
      },
      {
        type: "action",
        id: "action-new-lead",
        title: "Add Client Lead",
        subtitle: "Action · Create CRM lead",
        target: "leads",
        filter: "All",
        create: true,
        permission: "leads.manage",
        keywords: ["new lead", "add lead", "crm", "client", "funnel", "pipeline", "lead"],
      },
      {
        type: "nav",
        id: "nav-tasks",
        title: "Tasks & Execution",
        subtitle: "Navigation · Team tasks & boards",
        target: "tasks",
        keywords: ["tasks", "todo", "board", "execution"],
      },
      {
        type: "nav",
        id: "nav-projects",
        title: "Projects & Milestones",
        subtitle: "Navigation · Roadmap & deliveries",
        target: "projects",
        keywords: ["projects", "roadmap", "milestones"],
      },
      {
        type: "nav",
        id: "nav-money",
        title: "Financial Overview",
        subtitle: "Navigation · Ledger & transactions",
        target: "money",
        keywords: ["finance", "money", "expenses", "income", "ledger", "savings", "funds"],
      },
      {
        type: "nav",
        id: "nav-leads",
        title: "Leads & Funnels",
        subtitle: "Navigation · Growth pipeline",
        target: "leads",
        keywords: ["leads", "funnels", "crm", "growth"],
      },
      {
        type: "nav",
        id: "nav-calendar",
        title: "Calendar",
        subtitle: "Navigation · Schedule & events",
        target: "calendar",
        keywords: ["calendar", "schedule", "events", "dates"],
      },
      {
        type: "nav",
        id: "nav-team",
        title: "Team Accounts",
        subtitle: "Navigation · Workspace members",
        target: "team",
        keywords: ["team", "accounts", "members", "users"],
      },
    ]
      .filter((item) => {
        if (item.permission && !app.can(item.permission as any)) return false;
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.keywords.some((kw) => kw.includes(q) || q.includes(kw))
        );
      })
      .map((item) => ({
        type: item.type,
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        target: item.target,
        filter: item.filter,
        create: item.create,
        projectId: undefined,
      }));

    const matchingTasks = app.tasks
      .filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.projectName?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((t) => ({ type: "task", id: t.id, title: t.title, subtitle: `Task · ${t.projectName || "General"}`, target: "tasks", projectId: undefined }));

    const matchingProjects = app.projects
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((p) => ({ type: "project", id: p.id, title: p.name, subtitle: `Project · ${p.category}`, target: "projects", projectId: p.id }));

    const matchingLeads = app.leads
      .filter((l) => l.name.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q))
      .slice(0, 3)
      .map((l) => ({ type: "lead", id: l.id, title: l.name, subtitle: `Lead · ${l.category || l.status}`, target: "leads", projectId: undefined }));

    const matchingExpenses = app.expenses
      .filter((e) => e.title.toLowerCase().includes(q))
      .slice(0, 3)
      .map((e) => ({ type: "expense", id: e.id, title: e.title, subtitle: `${e.type.toUpperCase()} · ₹${e.amount.toLocaleString("en-IN")}`, target: "money", projectId: undefined }));

    return [...appActions, ...matchingTasks, ...matchingProjects, ...matchingLeads, ...matchingExpenses];
  }, [query, app]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-16 px-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Command search"
        className="w-full max-w-lg bg-[#000000] text-white border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-scaleUp"
        style={{
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800 bg-[#0A0A0A]">
          <Search size={20} className="text-white shrink-0" />
          <input
            type="text"
            aria-label="Search workspace"
            placeholder="Search features, tasks, projects, leads..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder-neutral-500 outline-none text-base font-medium"
          />
          {query ? (
            <button
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="p-1 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-400">
              <Command size={10} /> K
            </kbd>
          )}
        </div>

        {/* Action Commands Shortcuts when search query is empty */}
        {!query.trim() && (
          <div className="p-4 overflow-y-auto space-y-4">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 px-3 mb-2 flex items-center gap-1.5 font-bold">
                <Sparkles size={12} className="text-white" /> Instant Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {app.can('tasks.manage') && <button
                  onClick={() => {
                    onClose();
                    app.navigateTo("tasks", "All", true);
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-white hover:bg-neutral-800 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center shrink-0">
                    <Plus size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white transition-colors">
                      New Task
                    </span>
                    <span className="text-[10px] text-neutral-400">Create & assign work</span>
                  </div>
                </button>}

                {app.can('projects.manage') && <button
                  onClick={() => {
                    onClose();
                    app.navigateTo("projects", "Active", true);
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-white hover:bg-neutral-800 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center shrink-0">
                    <Briefcase size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white transition-colors">
                      New Project
                    </span>
                    <span className="text-[10px] text-neutral-400">Launch roadmap</span>
                  </div>
                </button>}

                {app.can('finance.manage') && <button
                  onClick={() => {
                    onClose();
                    app.navigateTo("money", "All", true);
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-white hover:bg-neutral-800 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center shrink-0">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white transition-colors">
                      Log Finance
                    </span>
                    <span className="text-[10px] text-neutral-400">Income & expenses</span>
                  </div>
                </button>}

                {app.can('leads.manage') && <button
                  onClick={() => {
                    onClose();
                    app.navigateTo("leads", "All", true);
                  }}
                  className="flex items-center gap-2.5 p-3 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-white hover:bg-neutral-800 text-left transition-all group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-xl bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center shrink-0">
                    <Target size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-white transition-colors">
                      Add Lead
                    </span>
                    <span className="text-[10px] text-neutral-400">CRM pipeline</span>
                  </div>
                </button>}
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-neutral-400 px-3 mb-2 font-bold">
                Quick Jump
              </p>
              <div className="space-y-1">
                {[
                  { label: "Tasks & Execution", screen: "tasks", icon: CheckCircle2 },
                  { label: "Projects & Milestones", screen: "projects", icon: Briefcase },
                  { label: "Financial Overview", screen: "money", icon: Wallet },
                  { label: "Leads & Funnels", screen: "leads", icon: Target },
                ].map((nav) => {
                  const NavIcon = nav.icon;
                  return (
                    <button
                      key={nav.screen}
                      onClick={() => {
                        onClose();
                        app.navigateTo(nav.screen as any);
                      }}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-xs font-medium text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <NavIcon size={15} className="text-neutral-400" />
                        <span>{nav.label}</span>
                      </div>
                      <ArrowRight size={13} className="text-neutral-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Live Search Results */}
        {query.trim() && (
          <div className="p-3 overflow-y-auto max-h-[60vh] space-y-1">
            {filtered.length > 0 ? (
              filtered.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    onClose();
                    if ((item as any).create) {
                      app.navigateTo(item.target as any, (item as any).filter || "All", true);
                    } else if (item.projectId) {
                      app.selectProject(item.projectId);
                    } else {
                      app.navigateTo(item.target as any);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-neutral-900 border border-transparent hover:border-neutral-800 text-left transition-colors cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <span className="block text-sm font-semibold text-white group-hover:underline transition-colors">
                      {item.title}
                    </span>
                    <span className="block text-xs font-mono text-neutral-400">
                      {item.subtitle}
                    </span>
                  </div>
                  <ArrowRight size={14} className="text-neutral-500 group-hover:text-white transition-colors" />
                </button>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-neutral-500 space-y-1">
                <p className="font-semibold text-neutral-400">No matching records found</p>
                <p>Try searching for tasks, project titles, client leads, or features.</p>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 bg-[#0A0A0A] border-t border-neutral-800 text-[11px] font-mono text-neutral-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <img src="/logo.png" alt="HAN" className="h-3.5 w-auto object-contain" />
            HAN Command Hub v2.0
          </span>
          <button
            aria-label="Close command search"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="hidden sm:inline">Press Esc to close</span>
            <span className="sm:hidden">Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
