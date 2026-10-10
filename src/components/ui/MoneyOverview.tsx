import { useState } from "react";
import {
  LockKeyhole,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  CheckCircle2,
  Receipt,
  Plus,
  ArrowRightLeft,
  Search,
  Filter,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { RecordData } from "../../context/AppContext";
import { dateLabel, today } from "../../context/dates";

const rupees = (amount: number) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export function MoneyOverview({
  onAdd,
  onEdit,
  onDelete,
}: {
  onAdd: (table: string, initialValues?: Record<string, unknown>) => void;
  onEdit: (item: RecordData) => void;
  onDelete: (item: RecordData) => void;
}) {
  const app = useApp();
  const finance = app.state.finance;
  const isOwner = app.user?.role === "OWNER";
  const canManageFinance = isOwner || app.can("finance.manage");

  const [activeTab, setActiveTab] = useState<"Overview" | "Transactions" | "Salaries" | "Settlements">("Overview");
  const [transactionFilter, setTransactionFilter] = useState<"All" | "income" | "expense">("All");
  const [searchQuery, setSearchQuery] = useState("");

  const founderTotals = finance?.founderTotals || [];
  const pairwise = finance?.pairwise || [];
  const settlements = (app.state.settlements || []) as unknown as Array<{
    id: string;
    payerId: string;
    recipientId: string;
    amount: number;
    date: string;
    paymentReference?: string;
    notes?: string;
  }>;

  const filteredTransactions = app.expenses.filter((item) => {
    if (transactionFilter !== "All" && item.type !== transactionFilter) return false;
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <section className="space-y-4 select-none" aria-label="Funds and shared financial ledger">
      {/* Sub-Navigation Tabs matching Screen 7, 8, 9 */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(["Overview", "Transactions", "Salaries", "Settlements"] as const).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-white text-black shadow-md"
                  : "bg-[#141416] text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB (Screen 7) ── */}
      {activeTab === "Overview" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Spendable Funds Card */}
          <div className="p-5 rounded-3xl bg-[#111113] border border-neutral-800/80 shadow-xl space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-[#19191D] border border-neutral-800 flex items-center justify-center text-neutral-400">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs font-mono font-semibold tracking-wider uppercase text-neutral-400">
                Spendable Funds
              </p>
              <h2 className="font-serif text-3xl font-bold text-white tracking-tight mt-0.5">
                ₹{app.totalFunds.toLocaleString("en-IN")}
              </h2>
              <p className="text-xs text-neutral-400 mt-1 font-sans">
                Available for salaries and expenses (savings excluded)
              </p>
            </div>
          </div>

          {/* 2-Column Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 shadow-md">
              <p className="text-xs text-neutral-400 font-sans">Total Income</p>
              <p className="font-serif text-xl font-bold text-white mt-1">
                {rupees(app.totalIncome)}
              </p>
              <p className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                <ArrowDownLeft size={13} /> 100% this month
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 shadow-md">
              <p className="text-xs text-neutral-400 font-sans">Total Outflow</p>
              <p className="font-serif text-xl font-bold text-white mt-1">
                {rupees(app.totalExpenses)}
              </p>
              <p className="text-[11px] font-mono text-neutral-400 mt-1 flex items-center gap-1">
                <ArrowUpRight size={13} /> 0% this month
              </p>
            </div>
          </div>

          {/* Secondary 2-Column Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 shadow-md">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold">
                <LockKeyhole size={14} />
                <span>Protected Savings</span>
              </div>
              <p className="text-base font-bold font-mono text-white mt-1.5" data-testid="savings-balance">
                {rupees(app.totalSavings)}
              </p>
              <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                Not used in operations
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 shadow-md">
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs font-semibold">
                <Receipt size={14} />
                <span>This Month Spend</span>
              </div>
              <p className="text-base font-bold font-mono text-white mt-1.5">
                {rupees(finance?.currentMonthExpenses || 0)}
              </p>
              <p className="text-[10px] text-neutral-500 mt-1 font-sans">
                Active operational spend
              </p>
            </div>
          </div>

          {/* Financial Operations Section */}
          {canManageFinance && (
            <div className="space-y-2.5 pt-2">
              <h3 className="text-xs font-bold text-white tracking-tight">
                Financial Operations
              </h3>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  aria-label="Add income"
                  onClick={() => onAdd("income")}
                  className="py-3 px-4 rounded-xl bg-[#141416] border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                >
                  <Plus size={15} /> Add Income
                </button>

                <button
                  aria-label="Add expense"
                  onClick={() => onAdd("expenses")}
                  className="py-3 px-4 rounded-xl bg-[#141416] border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                >
                  <Plus size={15} /> Record Expense
                </button>

                <button
                  onClick={() =>
                    onAdd("settlements", {
                      payerId: app.user?.id || "user-1",
                      recipientId: "user-1",
                      amount: 0,
                      date: today(),
                    })
                  }
                  className="py-3 px-4 rounded-xl bg-[#141416] border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                >
                  <ArrowRightLeft size={15} /> Settle Debt
                </button>

                <button
                  aria-label="Protect savings"
                  onClick={() => onAdd("savings_entries")}
                  className="py-3 px-4 rounded-xl bg-[#141416] border border-neutral-800 hover:border-neutral-700 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
                >
                  <LockKeyhole size={15} /> Protect Savings
                </button>
              </div>

              <button
                aria-label="Record salary"
                onClick={() => onAdd("salary_payments")}
                className="w-full py-3.5 px-4 rounded-xl bg-[#18181C] border border-neutral-700 hover:border-neutral-600 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-98 mt-2"
              >
                <Wallet size={15} /> + Allot / Pay Salary
              </button>
            </div>
          )}
          {/* Reimbursement Settlements History */}
          <details className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 text-xs mt-3">
            <summary className="font-bold text-white cursor-pointer min-h-11 flex items-center justify-between">
              <span>Reimbursement Settlements History ({settlements.length})</span>
            </summary>
            <div className="space-y-2 pt-3 border-t border-neutral-800 mt-2">
              {settlements.length === 0 ? (
                <p className="text-neutral-500 py-2">No reimbursement settlements recorded yet.</p>
              ) : (
                settlements.map((set) => {
                  const payerName = app.state.users.find((u) => u.id === set.payerId)?.name || set.payerId;
                  const recName = app.state.users.find((u) => u.id === set.recipientId)?.name || set.recipientId;
                  return (
                    <div key={set.id} className="p-2.5 bg-[#18181C] rounded-xl text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-white">
                        <span>{payerName} → {recName}</span>
                        <span className="font-mono text-emerald-400">{rupees(set.amount)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>{dateLabel(String(set.date))}</span>
                        {set.paymentReference && <span>Ref: {set.paymentReference}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </details>

          {/* Salary Payment History */}
          <details className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 text-xs mt-3">
            <summary className="font-bold text-white cursor-pointer min-h-11 flex items-center justify-between">
              <span>Salary Payment History ({app.state.salary_payments.length})</span>
            </summary>
            <div className="space-y-2 pt-3 mt-2">
              {app.state.salary_payments.length === 0 ? (
                <p className="text-neutral-500 py-2">No salary payments recorded.</p>
              ) : (
                app.state.salary_payments.map((item) => (
                  <div key={item.id} className="border-t border-neutral-800/60 pt-2.5 space-y-1">
                    <div className="flex justify-between font-semibold text-white">
                      <span>{String(item.name || "Recipient")}</span>
                      <span className="font-mono text-emerald-400">{rupees(Number(item.amount))}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-400">
                      <span>{dateLabel(String(item.date))}</span>
                      <span>Ref: {String(item.paymentReference || "Direct")}</span>
                    </div>
                    {canManageFinance && (
                      <div className="flex gap-3 pt-1">
                        <button
                          className="text-[11px] text-white underline cursor-pointer"
                          onClick={() => onEdit(item)}
                        >
                          Correct record
                        </button>
                        <button
                          className="text-[11px] text-red-400 underline cursor-pointer"
                          onClick={() => onDelete(item)}
                        >
                          Delete record
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </details>
        </div>
      )}

      {/* ── TRANSACTIONS TAB (Screen 8) ── */}
      {activeTab === "Transactions" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Sub-Filters: All, Income, Expenses */}
          <div className="flex gap-2">
            {(["All", "income", "expense"] as const).map((filter) => {
              const isActive = transactionFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setTransactionFilter(filter)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-white text-black"
                      : "bg-[#141416] text-neutral-400 hover:text-white border border-neutral-800"
                  }`}
                >
                  {filter === "All" ? "All" : filter === "income" ? "Income" : "Expenses"}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3.5 text-neutral-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="han-input w-full pl-10 pr-10 text-xs bg-[#111113] border-neutral-800 text-white"
            />
            <div className="absolute right-3.5 text-neutral-500">
              <Filter size={15} />
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-2">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => {
                const isIncome = tx.type === "income";
                return (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-2xl bg-[#111113] border border-neutral-800/80 flex items-center justify-between gap-3 shadow-sm hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isIncome
                            ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-400"
                            : "bg-red-950/40 border-red-800/60 text-red-400"
                        }`}
                      >
                        {isIncome ? <ArrowDownLeft size={18} /> : <Receipt size={18} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-white truncate">{tx.title}</p>
                        <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                          {dateLabel(tx.date)} · {tx.category || (isIncome ? "Income" : "Operating")}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono font-bold text-sm ${
                          isIncome ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-neutral-500 bg-[#111113] rounded-2xl border border-neutral-800">
                No transactions found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SALARIES TAB (Screen 9) ── */}
      {activeTab === "Salaries" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Top Summary Card */}
          <div className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 flex items-center justify-between shadow-md">
            <div>
              <p className="text-xs text-neutral-400 font-sans">Total payouts this month</p>
              <p className="font-serif text-2xl font-bold text-white mt-0.5">
                {rupees(finance?.salaries || 0)}
              </p>
            </div>
            {canManageFinance && (
              <button
                aria-label="Allot / Pay"
                onClick={() => onAdd("salary_payments")}
                className="py-2.5 px-4 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors cursor-pointer shadow-md"
              >
                Allot / Pay
              </button>
            )}
          </div>

          {/* Team Members Salaries List */}
          <div className="space-y-2">
            {(app.state.team_members.length > 0
              ? app.state.team_members
              : [
                  { id: "1", name: "Harsha", role: "Owner", salary: 0 },
                  { id: "2", name: "Nihaal", role: "Content & Web Development", salary: 0 },
                  { id: "3", name: "Lalitha", role: "Design & Coordination", salary: 0 },
                  { id: "4", name: "Abhilash", role: "Full Stack & Video Editing", salary: 0 },
                ]
            ).map((member) => {
              const memberPayments = app.state.salary_payments.filter(
                (s) => String(s.name).toLowerCase() === String(member.name).toLowerCase(),
              );
              const totalPaid = memberPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
              return (
                <div
                  key={member.id}
                  className="p-3.5 rounded-2xl bg-[#111113] border border-neutral-800/80 flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-white truncate">{member.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                      Role: {member.role}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      Paid: {rupees(totalPaid)} ({memberPayments.length} payouts)
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-[#18181C] border border-neutral-700/80 text-neutral-300 shrink-0">
                    {member.salary ? `${rupees(Number(member.salary))}` : "Unassigned"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Salary Payment History Accordion */}
          <details className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 text-xs">
            <summary className="font-bold text-white cursor-pointer min-h-11 flex items-center justify-between">
              <span>Salary Payment History ({app.state.salary_payments.length})</span>
            </summary>
            <div className="space-y-2 pt-3 mt-2">
              {app.state.salary_payments.length === 0 ? (
                <p className="text-neutral-500 py-2">No salary payments recorded.</p>
              ) : (
                app.state.salary_payments.map((item) => (
                  <div key={item.id} className="border-t border-neutral-800/60 pt-2.5 space-y-1">
                    <div className="flex justify-between font-semibold text-white">
                      <span>{String(item.name)}</span>
                      <span className="font-mono">{rupees(Number(item.amount))}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500">
                      {dateLabel(String(item.date))} · From spendable funds
                    </p>
                    {(isOwner || canManageFinance) && (
                      <div className="flex gap-3 pt-1">
                        <button
                          className="text-[11px] text-white underline cursor-pointer"
                          onClick={() => onEdit(item)}
                        >
                          Correct record
                        </button>
                        <button
                          className="text-[11px] text-red-400 underline cursor-pointer"
                          onClick={() => onDelete(item)}
                        >
                          Delete record
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </details>
        </div>
      )}

      {/* ── SETTLEMENTS TAB ── */}
      {activeTab === "Settlements" && (
        <div className="space-y-4 animate-fadeIn">
          {/* Founder Accountability Matrix */}
          <div className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-white" />
                <h3 className="font-bold text-xs text-white">Founder Balances & Positions</h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase">4 Founders</span>
            </div>

            <div className="space-y-2 pt-1 border-t border-neutral-800">
              {founderTotals.length === 0 ? (
                <p className="text-xs text-neutral-500 py-2">No founder transactions recorded yet.</p>
              ) : (
                founderTotals.map((founder) => (
                  <div
                    key={founder.id}
                    className="p-3 bg-[#18181C] rounded-xl border border-neutral-700/60 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-white">{founder.name}</span>
                      <span className="font-mono text-neutral-300">
                        {founder.outstanding > 0
                          ? `+ ${rupees(founder.receivable)} Receivable`
                          : founder.outstanding < 0
                            ? `- ${rupees(founder.payable)} Payable`
                            : "Settled (₹0.00)"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pairwise Obligations */}
          <div className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 space-y-3">
            <h3 className="font-bold text-xs text-white">🤝 Pairwise Reimbursements</h3>
            <div className="space-y-2 pt-1 border-t border-neutral-800">
              {pairwise.length === 0 ? (
                <div className="flex items-center gap-2 py-2 text-xs text-neutral-400">
                  <CheckCircle2 size={15} className="text-white" />
                  <span>All founder reimbursement obligations are reconciled.</span>
                </div>
              ) : (
                pairwise.map((pair, index) => (
                  <div
                    key={`${pair.debtorId}-${pair.creditorId}-${index}`}
                    className="flex items-center justify-between p-3 bg-[#18181C] rounded-xl border border-neutral-700/60 text-xs"
                  >
                    <div>
                      <p className="text-neutral-300">
                        <b className="text-white">{pair.debtorName}</b> owes <b className="text-white">{pair.creditorName}</b>
                      </p>
                      <p className="font-mono font-bold text-white mt-0.5">{rupees(pair.amount)}</p>
                    </div>
                    {canManageFinance && (
                      <button
                        className="py-1.5 px-3 rounded-lg bg-white text-black font-bold text-[11px] cursor-pointer"
                        onClick={() =>
                          onAdd("settlements", {
                            payerId: pair.debtorId,
                            recipientId: pair.creditorId,
                            amount: pair.amount,
                            date: today(),
                          })
                        }
                      >
                        Record settlement
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Reimbursement Settlements History */}
          <details className="p-4 rounded-2xl bg-[#111113] border border-neutral-800/80 text-xs">
            <summary className="font-bold text-white cursor-pointer min-h-11 flex items-center justify-between">
              <span>Reimbursement Settlements History ({settlements.length})</span>
            </summary>
            <div className="space-y-2 pt-3 border-t border-neutral-800 mt-2">
              {settlements.length === 0 ? (
                <p className="text-neutral-500 py-2">No reimbursement settlements recorded yet.</p>
              ) : (
                settlements.map((set) => {
                  const payerName = app.state.users.find((u) => u.id === set.payerId)?.name || set.payerId;
                  const recName = app.state.users.find((u) => u.id === set.recipientId)?.name || set.recipientId;
                  return (
                    <div key={set.id} className="p-2.5 bg-[#18181C] rounded-xl text-xs space-y-1">
                      <div className="flex justify-between font-semibold text-white">
                        <span>{payerName} → {recName}</span>
                        <span className="font-mono text-emerald-400">{rupees(set.amount)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-neutral-400">
                        <span>{dateLabel(String(set.date))}</span>
                        {set.paymentReference && <span>Ref: {set.paymentReference}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
