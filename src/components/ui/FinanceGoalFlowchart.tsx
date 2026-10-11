import React, { useState, useEffect } from "react";
import {
  LockKeyhole,
  TrendingUp,
  Target,
  Plus,
  Edit2,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronDown,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { FinanceGoal } from "../../types";

const rupees = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

const DEFAULT_GOALS: FinanceGoal[] = [
  {
    id: "goal-runway",
    title: "6-Month Operating Runway & Reserve",
    category: "Runway",
    targetAmount: 250000,
    deadline: "2026-12-31",
    description: "Emergency runway securing team operations, essential cloud tools, and production costs.",
    isDefault: true,
  },
  {
    id: "goal-equipment",
    title: "Production Studio & AI Gear Fund",
    category: "Equipment",
    targetAmount: 150000,
    deadline: "2026-11-30",
    description: "Capital reserve for cinema optics, high-performance rendering workstations, and storage arrays.",
  },
  {
    id: "goal-security",
    title: "Founder Safety & Contingency Vault",
    category: "Security",
    targetAmount: 100000,
    deadline: "2026-10-31",
    description: "Autonomous security vault protected against lean seasonal project cycles.",
  },
  {
    id: "goal-expansion",
    title: "Creative Expansion & Marketing Fund",
    category: "Expansion",
    targetAmount: 500000,
    deadline: "2027-03-31",
    description: "Scale HAN Media Factory brand presence, commercial client acquisition, and creator network.",
  },
];

interface FinanceGoalFlowchartProps {
  onAddSavings: (initialValues?: Record<string, unknown>) => void;
  canManage?: boolean;
}

export const FinanceGoalFlowchart: React.FC<FinanceGoalFlowchartProps> = ({
  onAddSavings,
  canManage = true,
}) => {
  const app = useApp();
  const currentSavings = app.totalSavings; // Live protected savings counted automatically!
  const totalIncome = app.totalIncome;
  const spendableFunds = app.totalFunds;

  // Goals state with persistence
  const [goals, setGoals] = useState<FinanceGoal[]>(() => {
    try {
      const saved = localStorage.getItem("han_finance_goals_v2");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_GOALS;
  });

  const [activeGoalId, setActiveGoalId] = useState<string>(() => {
    return localStorage.getItem("han_active_goal_id") || "goal-runway";
  });

  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isAddingNewGoal, setIsAddingNewGoal] = useState(false);

  // Form states for Goal creation / edit
  const [formTitle, setFormTitle] = useState("");
  const [formAmount, setFormAmount] = useState(250000);
  const [formCategory, setFormCategory] = useState<FinanceGoal["category"]>("Runway");
  const [formDeadline, setFormDeadline] = useState("2026-12-31");
  const [formDesc, setFormDesc] = useState("");

  const activeGoal = goals.find((g) => g.id === activeGoalId) || goals[0] || DEFAULT_GOALS[0];

  useEffect(() => {
    try {
      localStorage.setItem("han_finance_goals_v2", JSON.stringify(goals));
    } catch {
      // ignore
    }
  }, [goals]);

  useEffect(() => {
    try {
      localStorage.setItem("han_active_goal_id", activeGoalId);
    } catch {
      // ignore
    }
  }, [activeGoalId]);

  const progressPercent = Math.min(
    100,
    activeGoal.targetAmount > 0 ? Math.round((currentSavings / activeGoal.targetAmount) * 100) : 0,
  );
  const remainingGap = Math.max(0, activeGoal.targetAmount - currentSavings);

  // Milestone calculations
  const milestones = [
    {
      pct: 25,
      label: "Buffer Inception",
      target: Math.round(activeGoal.targetAmount * 0.25),
      desc: "Initial safety cushion protecting baseline overheads.",
    },
    {
      pct: 50,
      label: "Core Reserve",
      target: Math.round(activeGoal.targetAmount * 0.5),
      desc: "Halfway threshold establishing predictable team runway.",
    },
    {
      pct: 75,
      label: "Scale Readiness",
      target: Math.round(activeGoal.targetAmount * 0.75),
      desc: "High resilience buffer allowing confident new commitments.",
    },
    {
      pct: 100,
      label: "Goal Achieved",
      target: activeGoal.targetAmount,
      desc: "100% Fully funded autonomous capital reservoir.",
    },
  ];

  const handleOpenEdit = () => {
    setFormTitle(activeGoal.title);
    setFormAmount(activeGoal.targetAmount);
    setFormCategory(activeGoal.category);
    setFormDeadline(activeGoal.deadline || "");
    setFormDesc(activeGoal.description || "");
    setIsAddingNewGoal(false);
    setIsEditingGoal(true);
  };

  const handleOpenNew = () => {
    setFormTitle("");
    setFormAmount(100000);
    setFormCategory("Runway");
    setFormDeadline("");
    setFormDesc("");
    setIsAddingNewGoal(true);
    setIsEditingGoal(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || formAmount <= 0) return;

    if (isAddingNewGoal) {
      const newGoal: FinanceGoal = {
        id: `goal-${Date.now()}`,
        title: formTitle.trim(),
        targetAmount: Number(formAmount),
        category: formCategory,
        deadline: formDeadline || undefined,
        description: formDesc.trim() || undefined,
      };
      setGoals((prev) => [...prev, newGoal]);
      setActiveGoalId(newGoal.id);
    } else {
      setGoals((prev) =>
        prev.map((g) =>
          g.id === activeGoal.id
            ? {
                ...g,
                title: formTitle.trim(),
                targetAmount: Number(formAmount),
                category: formCategory,
                deadline: formDeadline || undefined,
                description: formDesc.trim() || undefined,
              }
            : g,
        ),
      );
    }
    setIsEditingGoal(false);
  };

  return (
    <div className="space-y-5 select-none" data-testid="finance-goal-flowchart">
      {/* ── GOAL SELECTOR & QUICK ACTIONS ── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface-elevated border border-border-subtle shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center text-emerald-400 shrink-0">
              <Target size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/60">
                  {activeGoal.category}
                </span>
                <span className="text-xs text-text-muted">Target Goal</span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-text-primary mt-0.5 tracking-tight">
                {activeGoal.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <button
                  onClick={handleOpenEdit}
                  className="p-2 rounded-xl bg-surface-overlay hover:bg-surface border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  title="Edit Active Goal"
                  aria-label="Edit Active Goal"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={handleOpenNew}
                  className="px-3 py-1.5 rounded-xl bg-surface-overlay hover:bg-surface border border-border-subtle text-xs font-semibold text-text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                  aria-label="New Goal"
                >
                  <Plus size={14} /> New Goal
                </button>
              </>
            )}
          </div>
        </div>

        {/* Goal Selector Dropdown / Badges */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {goals.map((g) => {
            const isSelected = g.id === activeGoal.id;
            const goalPct = Math.min(100, Math.round((currentSavings / g.targetAmount) * 100));
            return (
              <button
                key={g.id}
                onClick={() => setActiveGoalId(g.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? "bg-page text-text-primary border-border-strong shadow-md"
                    : "bg-surface-overlay text-text-secondary hover:text-text-primary border-border-subtle"
                }`}
              >
                <span>{g.title}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? "bg-black/30 text-emerald-400" : "bg-surface text-text-muted"
                  }`}
                >
                  {goalPct}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Savings Counter towards Goal */}
        <div className="p-4 rounded-2xl bg-surface/80 border border-border-subtle space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-sans text-text-secondary flex items-center gap-1.5">
                <LockKeyhole size={13} className="text-emerald-400" />
                Live Protected Savings Counted Towards Goal:
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-serif text-3xl font-bold text-text-primary tracking-tight">
                  {rupees(currentSavings)}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  of {rupees(activeGoal.targetAmount)} target
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span
                className={`inline-block text-xs font-bold font-mono px-2.5 py-1 rounded-full border ${
                  progressPercent >= 100
                    ? "bg-emerald-950/60 border-emerald-500/80 text-emerald-300"
                    : progressPercent >= 50
                      ? "bg-cyan-950/50 border-cyan-800/80 text-cyan-300"
                      : "bg-amber-950/50 border-amber-800/80 text-amber-300"
                }`}
              >
                {progressPercent >= 100 ? "🎉 Fully Funded" : `${progressPercent}% Achieved`}
              </span>
              <p className="text-[11px] text-text-muted mt-1 font-mono">
                {remainingGap > 0 ? `${rupees(remainingGap)} remaining to target` : "Target achieved!"}
              </p>
            </div>
          </div>

          {/* Progress Bar with Milestones Ticks */}
          <div className="relative pt-2">
            <div className="w-full h-3 bg-surface-overlay rounded-full overflow-hidden border border-border-subtle p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${Math.min(100, Math.max(2, progressPercent))}%` }}
              />
            </div>

            {/* Visual Markers at 25%, 50%, 75% */}
            <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1.5 px-0.5">
              <span>0%</span>
              <span className={currentSavings >= activeGoal.targetAmount * 0.25 ? "text-emerald-400 font-bold" : ""}>
                25% ({rupees(activeGoal.targetAmount * 0.25)})
              </span>
              <span className={currentSavings >= activeGoal.targetAmount * 0.5 ? "text-emerald-400 font-bold" : ""}>
                50% ({rupees(activeGoal.targetAmount * 0.5)})
              </span>
              <span className={currentSavings >= activeGoal.targetAmount * 0.75 ? "text-emerald-400 font-bold" : ""}>
                75% ({rupees(activeGoal.targetAmount * 0.75)})
              </span>
              <span className={currentSavings >= activeGoal.targetAmount ? "text-emerald-400 font-bold" : ""}>
                100%
              </span>
            </div>
          </div>

          {/* Quick Action: Protect Savings for this Goal */}
          {canManage && (
            <div className="pt-1 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  onAddSavings({
                    title: `Contribution to ${activeGoal.title}`,
                    amount: remainingGap > 0 ? Math.min(remainingGap, 25000) : 10000,
                    notes: `Allocated directly towards ${activeGoal.title}`,
                  })
                }
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-page text-text-primary text-xs font-bold hover:bg-neutral-200 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md active:scale-98"
                aria-label="Allocate Savings Towards Goal"
              >
                <Plus size={15} />
                <span>+ Allocate Savings to This Goal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── INTERACTIVE FINANCIAL FUND FLOWCHART ── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface-elevated border border-border-subtle shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={17} className="text-text-primary" />
            <h3 className="font-serif text-base font-bold text-text-primary">
              Fund Pipeline & Goal Flowchart
            </h3>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5 rounded">
            Live Stream
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Interactive map illustrating how gross income is separated into spendable operating funds and
          ringfenced into the protected savings vault to fund your milestone targets.
        </p>

        {/* Visual Flowchart Nodes Structure */}
        <div className="relative py-2 space-y-4">
          {/* Node 1: Cash Inflow */}
          <div className="p-4 rounded-2xl bg-surface-overlay border border-emerald-900/50 shadow-md relative group hover:border-emerald-600/60 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 flex items-center justify-center font-bold text-sm">
                  ₹
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    1. Gross Cash Inflow
                  </p>
                  <h4 className="font-serif text-lg font-bold text-text-primary mt-0.5">
                    {rupees(totalIncome)}
                  </h4>
                </div>
              </div>
              <span className="text-[11px] font-sans text-text-muted">Recorded Income</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Primary client retainers, deal payments, and commercial revenues flowing into the business.
            </p>
          </div>

          {/* Flow Connector Arrow 1 */}
          <div className="flex justify-center -my-2 relative z-10">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500/80 to-neutral-600" />
              <div className="w-6 h-6 rounded-full bg-surface border border-border-strong flex items-center justify-center text-text-secondary shadow-sm">
                <ChevronDown size={14} />
              </div>
              <div className="w-0.5 h-2 bg-neutral-600" />
            </div>
          </div>

          {/* Node 2: Operational Spend & Spendable Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface-overlay border border-border-subtle shadow-sm">
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-bold">
                2A. Spendable Balance
              </p>
              <h4 className="font-serif text-base font-bold text-text-primary mt-0.5">
                {rupees(spendableFunds)}
              </h4>
              <p className="text-[10px] text-text-muted mt-1">
                Available for active team salaries, vendor tools, and monthly expenses.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-overlay border border-border-subtle shadow-sm">
              <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary font-bold">
                2B. Operational Spend
              </p>
              <h4 className="font-serif text-base font-bold text-text-primary mt-0.5">
                {rupees(app.totalExpenses)}
              </h4>
              <p className="text-[10px] text-text-muted mt-1">
                Historical operating outflows recorded in ledger.
              </p>
            </div>
          </div>

          {/* Flow Connector Arrow 2 */}
          <div className="flex justify-center -my-2 relative z-10">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-neutral-600 to-emerald-500/80" />
              <div className="w-6 h-6 rounded-full bg-surface border border-emerald-600/60 flex items-center justify-center text-emerald-400 shadow-sm">
                <LockKeyhole size={12} />
              </div>
              <div className="w-0.5 h-2 bg-emerald-500/80" />
            </div>
          </div>

          {/* Node 3: Protected Savings Vault (Counted towards Goal) */}
          <div className="p-4 rounded-2xl bg-surface-overlay border border-emerald-500/40 shadow-lg relative bg-gradient-to-br from-surface-overlay to-emerald-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-900/40 border border-emerald-600/70 text-emerald-400 flex items-center justify-center">
                  <LockKeyhole size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                      3. Protected Savings Reserve
                    </p>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-900/50 text-emerald-300 border border-emerald-700/50">
                      Ringfenced
                    </span>
                  </div>
                  <h4 className="font-serif text-lg font-bold text-text-primary mt-0.5">
                    {rupees(currentSavings)}
                  </h4>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                  100% Counted Live
                </span>
                <p className="text-[10px] text-text-muted mt-0.5">Immutable Balance</p>
              </div>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Protected capital cannot be drained by accidental operating deficits. It feeds directly into
              your active targets.
            </p>
          </div>

          {/* Flow Connector Arrow 3 */}
          <div className="flex justify-center -my-2 relative z-10">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-500/80 to-cyan-500/80" />
              <div className="w-6 h-6 rounded-full bg-surface border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-sm">
                <Target size={13} />
              </div>
              <div className="w-0.5 h-2 bg-cyan-500/80" />
            </div>
          </div>

          {/* Node 4: Target Goal Reservoir */}
          <div className="p-4 rounded-2xl bg-surface-overlay border border-cyan-500/40 shadow-xl bg-gradient-to-br from-surface-overlay to-cyan-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-950/60 border border-cyan-700/80 text-cyan-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    4. Active Target Goal: {activeGoal.title}
                  </p>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <h4 className="font-serif text-lg font-bold text-text-primary">
                      {progressPercent}% Funded
                    </h4>
                    <span className="text-xs font-mono text-text-muted">
                      ({rupees(currentSavings)} / {rupees(activeGoal.targetAmount)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {activeGoal.description && (
              <p className="text-[11px] text-text-secondary mt-2 italic">
                "{activeGoal.description}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── VISUAL MILESTONE ROADMAP ── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface-elevated border border-border-subtle shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={17} className="text-text-primary" />
            <h3 className="font-serif text-base font-bold text-text-primary">
              Milestone Roadmap & Runway Stages
            </h3>
          </div>
          <span className="text-xs font-mono text-text-secondary">
            {milestones.filter((m) => currentSavings >= m.target).length} of 4 Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {milestones.map((m) => {
            const isCompleted = currentSavings >= m.target;
            const isCurrent =
              !isCompleted &&
              (m.pct === 25 || currentSavings >= activeGoal.targetAmount * ((m.pct - 25) / 100));
            const deficit = Math.max(0, m.target - currentSavings);
            const isSelected = selectedMilestone === m.pct;

            return (
              <div
                key={m.pct}
                onClick={() => setSelectedMilestone(isSelected ? null : m.pct)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                  isCompleted
                    ? "bg-emerald-950/20 border-emerald-800/60 hover:border-emerald-500/80"
                    : isCurrent
                      ? "bg-cyan-950/20 border-cyan-700/80 hover:border-cyan-400 shadow-md ring-1 ring-cyan-500/30"
                      : "bg-surface-overlay border-border-subtle opacity-70 hover:opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono ${
                        isCompleted
                          ? "bg-emerald-900/60 text-emerald-400"
                          : isCurrent
                            ? "bg-cyan-900/60 text-cyan-300 animate-pulse"
                            : "bg-surface text-text-muted"
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={16} /> : `${m.pct}%`}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-text-primary">{m.label}</h4>
                      <p className="text-[10px] font-mono text-text-secondary">
                        Target: {rupees(m.target)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                      isCompleted
                        ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50"
                        : isCurrent
                          ? "bg-cyan-900/50 text-cyan-300 border border-cyan-700/50"
                          : "bg-surface text-text-muted border border-border-subtle"
                    }`}
                  >
                    {isCompleted ? "Achieved" : isCurrent ? "In Progress" : "Locked"}
                  </span>
                </div>

                <p className="text-[11px] text-text-secondary mt-2">{m.desc}</p>

                <div className="mt-2.5 pt-2 border-t border-border-subtle flex items-center justify-between text-[10px] font-mono">
                  <span className="text-text-muted">
                    {isCompleted ? "Milestone Secured" : `${rupees(deficit)} needed`}
                  </span>
                  <span className="text-text-primary font-semibold">
                    {Math.min(100, Math.round((currentSavings / m.target) * 100))}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL: EDIT OR CREATE GOAL ── */}
      {isEditingGoal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-surface-elevated border border-border-strong rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-text-primary">
                {isAddingNewGoal ? "Create Financial Goal" : "Edit Financial Goal"}
              </h3>
              <button
                onClick={() => setIsEditingGoal(false)}
                className="text-text-muted hover:text-text-primary text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Goal Title
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. 6-Month Operating Runway"
                  className="han-input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">
                    Target Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={formAmount}
                    onChange={(e) => setFormAmount(Number(e.target.value))}
                    className="han-input w-full text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="han-input w-full text-xs"
                  >
                    <option value="Runway">Runway</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Security">Security</option>
                    <option value="Expansion">Expansion</option>
                    <option value="Tax Reserve">Tax Reserve</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Target Deadline (Optional)
                </label>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  className="han-input w-full text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Description / Strategy
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe what this capital reserve accomplishes..."
                  className="han-input w-full text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingGoal(false)}
                  className="px-4 py-2 rounded-xl bg-surface-overlay text-text-secondary text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-page text-text-primary text-xs font-bold cursor-pointer shadow-md"
                >
                  Save Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
