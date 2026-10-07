import { LockKeyhole, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { RecordData } from "../../context/AppContext";
import { MoneyCard } from "./MoneyCard";
import { dateLabel } from "../../context/dates";
const rupees = (amount: number) => `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export function MoneyOverview({ onAdd, onEdit, onDelete }: { onAdd: (table: string) => void; onEdit: (item: RecordData) => void; onDelete: (item: RecordData) => void }) {
  const app = useApp(), finance = app.state.finance;
  return <section className="space-y-4" aria-label="Funds and protected savings">
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
    {app.user?.role === "OWNER" && <div className="grid grid-cols-2 gap-2">
      <button className="han-btn-secondary" onClick={() => onAdd("income")}>Add income</button>
      <button className="han-btn-secondary" onClick={() => onAdd("expenses")}>Add expense</button>
      <button className="han-btn-secondary" onClick={() => onAdd("savings_entries")}><LockKeyhole size={16} />Protect savings</button>
      <button className="han-btn-secondary" onClick={() => onAdd("salary_payments")}><Wallet size={16} />Record salary</button>
    </div>}
    <details className="han-card"><summary className="font-semibold cursor-pointer min-h-11 flex items-center">Savings history ({app.state.savings_entries.length})</summary>
      {app.state.savings_entries.length === 0 ? <p className="text-sm text-neutral-500">No funds moved into savings yet.</p> : app.state.savings_entries.map(item => <div className="border-t py-3" key={item.id}><p className="font-semibold">{String(item.title)} · {rupees(Number(item.amount))}</p><p className="text-xs text-neutral-500">{dateLabel(String(item.date))} · Protected</p>{!!item.notes && <p className="text-sm mt-2">{String(item.notes)}</p>}</div>)}
    </details>
    <details className="han-card"><summary className="font-semibold cursor-pointer min-h-11 flex items-center">Salary history ({app.state.salary_payments.length})</summary>
      <p className="text-xs text-neutral-500 mb-3">Paid only when you choose. Total recorded: {rupees(finance?.salaries || 0)}. Already included in expenses.</p>
      {app.state.salary_payments.length === 0 ? <p className="text-sm text-neutral-500">No salary payments recorded.</p> : app.state.salary_payments.map(item => <div className="border-t py-3" key={item.id}><p className="font-semibold">{String(item.name)} · {rupees(Number(item.amount))}</p><p className="text-xs text-neutral-500">{dateLabel(String(item.date))} · From funds</p>{app.user?.role === "OWNER" && <div className="flex gap-2"><button className="action underline" onClick={() => onEdit(item)}>Correct record</button><button className="action underline" onClick={() => onDelete(item)}>Delete record</button></div>}</div>)}
    </details>
  </section>;
}
