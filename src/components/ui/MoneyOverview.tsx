import { LockKeyhole, Wallet, ArrowDownLeft, ArrowUpRight, Users, Eye } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { RecordData } from "../../context/AppContext";
import { MoneyCard } from "./MoneyCard";
import { dateLabel } from "../../context/dates";

const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function MoneyOverview({ onAdd, onEdit, onDelete }: { onAdd: (table: string) => void; onEdit: (item: RecordData) => void; onDelete: (item: RecordData) => void }) {
  const app = useApp(), finance = app.state.finance;
  const isOwner = app.user?.role === "OWNER";

  return <section className="space-y-4" aria-label="Funds and protected savings">
    {/* TRANSPARENCY BADGE */}
    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-lg">
      <Eye size={14} className="text-black" />
      <span>100% Transparent Financial Ledger · Visible to all team members</span>
    </div>

    <MoneyCard amount={app.totalFunds} />

    <div className="han-card savings-card">
      <div className="flex items-center gap-2 text-emerald-800"><LockKeyhole size={18} /><h2 className="font-semibold text-sm">Protected savings</h2></div>
      <p className="text-2xl font-bold mt-2" data-testid="savings-balance">{rupees(app.totalSavings)}</p>
      <p className="text-xs text-neutral-600 mt-2">Kept out of spendable funds. Expenses and salaries cannot use this money.</p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className="han-card"><ArrowDownLeft size={17} /><p className="text-xs text-neutral-500 mt-2">Total income</p><b>{rupees(app.totalIncome)}</b></div>
      <div className="han-card"><ArrowUpRight size={17} /><p className="text-xs text-neutral-500 mt-2">Expenses incl. salaries</p><b>{rupees(app.totalExpenses)}</b></div>
    </div>

    <p className="text-xs text-neutral-500">Income − expenses − protected savings = spendable funds. Transfers to savings are not expenses.</p>

    {app.totalFunds < 0 && <p role="alert" className="han-card text-red-700">Existing records show a funds shortfall. Add income or correct an expense before spending or protecting more money.</p>}

    {/* ADMIN CONTROLS: ALLOT EXPENSE & ASSIGN/PAY SALARIES */}
    {isOwner && (
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Admin Actions</p>
        <div className="grid grid-cols-2 gap-2">
          <button className="han-btn-secondary" onClick={() => onAdd("income")}>+ Add Income</button>
          <button className="han-btn-secondary" onClick={() => onAdd("expenses")}>+ Allot Expense</button>
          <button className="han-btn-secondary" onClick={() => onAdd("savings_entries")}><LockKeyhole size={15} /> Protect Savings</button>
          <button className="han-btn-secondary" onClick={() => onAdd("salary_payments")}><Wallet size={15} /> Allot / Pay Salary</button>
        </div>
      </div>
    )}

    {/* TEAM SALARIES & ALLOTMENTS OVERVIEW */}
    <div className="han-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-black" />
          <h3 className="font-semibold text-sm">Team Salary Allotments</h3>
        </div>
        <span className="text-xs text-neutral-500 font-mono">Total paid: {rupees(finance?.salaries || 0)}</span>
      </div>
      <div className="space-y-2 text-xs border-t pt-2">
        {app.state.team_members.length === 0 ? (
          <p className="text-neutral-500">No team profiles added yet. Add team members to assign monthly salaries.</p>
        ) : (
          app.state.team_members.map(member => {
            const memberPayments = app.state.salary_payments.filter(s => String(s.name).toLowerCase() === String(member.name).toLowerCase());
            const totalPaidToMember = memberPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            return (
              <div key={member.id} className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <div className="flex items-center justify-between font-semibold text-sm">
                  <span>{member.name}</span>
                  <span className="text-emerald-700">{member.salary ? `${rupees(Number(member.salary))} / mo` : "Salary unassigned"}</span>
                </div>
                <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                  <span>Role: {member.role}</span>
                  <span>Total Paid to Date: {rupees(totalPaidToMember)} ({memberPayments.length} payouts)</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>

    <details className="han-card"><summary className="font-semibold cursor-pointer min-h-11 flex items-center">Salary Payment History ({app.state.salary_payments.length})</summary>
      <p className="text-xs text-neutral-500 mb-3">Paid only when allotted by admin. Total recorded: {rupees(finance?.salaries || 0)}. Included in expenses.</p>
      {app.state.salary_payments.length === 0 ? <p className="text-sm text-neutral-500">No salary payments recorded.</p> : app.state.salary_payments.map(item => <div className="border-t py-3" key={item.id}><p className="font-semibold">{String(item.name)} · {rupees(Number(item.amount))}</p><p className="text-xs text-neutral-500">{dateLabel(String(item.date))} · From spendable funds</p>{!!item.notes && <p className="text-sm mt-1">{String(item.notes)}</p>}{isOwner && <div className="flex gap-2 mt-2"><button className="action underline" onClick={() => onEdit(item)}>Correct record</button><button className="action underline" onClick={() => onDelete(item)}>Delete record</button></div>}</div>)}
    </details>

    <details className="han-card"><summary className="font-semibold cursor-pointer min-h-11 flex items-center">Savings History ({app.state.savings_entries.length})</summary>
      {app.state.savings_entries.length === 0 ? <p className="text-sm text-neutral-500">No funds moved into savings yet.</p> : app.state.savings_entries.map(item => <div className="border-t py-3" key={item.id}><p className="font-semibold">{String(item.title)} · {rupees(Number(item.amount))}</p><p className="text-xs text-neutral-500">{dateLabel(String(item.date))} · Protected</p>{!!item.notes && <p className="text-sm mt-2">{String(item.notes)}</p>}</div>)}
    </details>
  </section>;
}

