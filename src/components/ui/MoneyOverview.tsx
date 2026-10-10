import {
  LockKeyhole,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import type { RecordData } from "../../context/AppContext";
import { MoneyCard } from "./MoneyCard";
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

  return (
    <section className="space-y-4" aria-label="Funds and shared financial ledger">
      {/* TRANSPARENCY BANNER */}
      <div className="flex items-center justify-between text-xs font-semibold bg-neutral-950 text-white px-3.5 py-2.5 rounded-xl border border-neutral-800 shadow-sm">
        <div className="flex items-center gap-2">
          <Eye size={14} className="text-white" />
          <span>Transparent Founder Ledger · Shared with all 4 founders</span>
        </div>
        <span className="text-[10px] font-mono tracking-wider text-neutral-300 uppercase px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700">
          Shared Ledger
        </span>
      </div>

      {/* HERO FUNDS CARD */}
      <MoneyCard amount={app.totalFunds} />

      {/* EXECUTIVE SUMMARY TILES */}
      <div className="grid grid-cols-2 gap-3">
        <div className="han-card bg-neutral-950 border-neutral-800 text-white shadow-md">
          <div className="flex items-center gap-1.5 text-neutral-300">
            <LockKeyhole size={16} />
            <span className="text-xs font-semibold">Protected savings</span>
          </div>
          <p className="text-xl font-bold font-mono mt-1 text-white" data-testid="savings-balance">
            {rupees(app.totalSavings)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Protected from operational expenses & salaries
          </p>
        </div>

        <div className="han-card bg-white border-neutral-200 shadow-sm">
          <div className="flex items-center gap-1.5 text-neutral-700">
            <Receipt size={16} />
            <span className="text-xs font-semibold">This Month Spend</span>
          </div>
          <p className="text-xl font-bold font-mono mt-1 text-neutral-900">
            {rupees(finance?.currentMonthExpenses || 0)}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1">
            Active verified operational spend
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="han-card bg-white border-neutral-200 shadow-sm">
          <ArrowDownLeft size={16} className="text-black" />
          <p className="text-xs text-neutral-500 mt-1.5">Total Income</p>
          <b className="font-mono text-base text-black">{rupees(app.totalIncome)}</b>
        </div>
        <div className="han-card bg-white border-neutral-200 shadow-sm">
          <ArrowUpRight size={16} className="text-black" />
          <p className="text-xs text-neutral-500 mt-1.5">Total Outflow</p>
          <b className="font-mono text-base text-black">{rupees(app.totalExpenses)}</b>
        </div>
      </div>

      {/* INDIVIDUAL VS SHARED SPENDING BREAKDOWN */}
      <div className="han-card space-y-2 text-xs bg-white border-neutral-200">
        <div className="flex items-center justify-between font-semibold">
          <span>Spending Breakdown</span>
          <span className="text-neutral-500">
            Active transactions: {finance?.activeExpensesCount || 0}
            {(finance?.voidExpensesCount || 0) > 0 && ` (${finance?.voidExpensesCount} voided)`}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-100">
          <div className="p-2 bg-neutral-100 rounded-lg">
            <span className="text-neutral-500 block">Shared Across Founders</span>
            <span className="font-mono font-bold text-neutral-900">
              {rupees(finance?.sharedSpending || 0)}
            </span>
          </div>
          <div className="p-2 bg-neutral-100 rounded-lg">
            <span className="text-neutral-500 block">Individual Founder Spend</span>
            <span className="font-mono font-bold text-neutral-900">
              {rupees(finance?.individualSpending || 0)}
            </span>
          </div>
        </div>
        {(finance?.missingReceiptsCount || 0) > 0 && (
          <div className="flex items-center gap-1.5 text-neutral-900 bg-neutral-100 p-2 rounded-lg border border-neutral-300">
            <AlertTriangle size={14} className="flex-shrink-0 text-black" />
            <span>
              {finance?.missingReceiptsCount} expense(s) are missing receipts/invoices.
            </span>
          </div>
        )}
      </div>

      {/* QUICK FINANCIAL ACTIONS */}
      {canManageFinance && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Financial Operations
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button aria-label="Add expense" className="han-btn-secondary" onClick={() => onAdd("expenses")}>
              + Record Expense
            </button>
            <button aria-label="Add income" className="han-btn-secondary" onClick={() => onAdd("income")}>
              + Add Income
            </button>
            <button
              className="han-btn-secondary"
              onClick={() =>
                onAdd("settlements", {
                  payerId: app.user?.id || "user-1",
                  recipientId: "user-1",
                  amount: 0,
                  date: today(),
                })
              }
            >
              🤝 Settle Debt
            </button>
            {isOwner && (
              <button
                aria-label="Protect savings"
                className="han-btn-secondary"
                onClick={() => onAdd("savings_entries")}
              >
                <LockKeyhole size={14} /> Protect Savings
              </button>
            )}
            {isOwner && (
              <button
                aria-label="Record salary"
                className="han-btn-secondary col-span-2"
                onClick={() => onAdd("salary_payments")}
              >
                <Wallet size={14} /> Allot / Pay Salary
              </button>
            )}
          </div>
        </div>
      )}

      {/* FOUNDER ACCOUNTABILITY MATRIX */}
      <div className="han-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-neutral-900" />
            <h3 className="font-semibold text-sm">Founder Balances & Positions</h3>
          </div>
          <span className="text-[11px] text-neutral-500">4 Founders</span>
        </div>
        <p className="text-[11px] text-neutral-500">
          Derived strictly from verified payments, expense allocations, and settlements.
        </p>

        <div className="space-y-2 pt-1 border-t border-neutral-100">
          {founderTotals.length === 0 ? (
            <p className="text-xs text-neutral-500">No founder transactions recorded yet.</p>
          ) : (
            founderTotals.map((founder) => {
              const isNetReceivable = founder.outstanding > 0;
              const isNetPayable = founder.outstanding < 0;
              const isSettled = Math.abs(founder.outstanding) < 0.005;

              return (
                <div
                  key={founder.id}
                  className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between font-semibold text-sm">
                    <span className="text-neutral-900">{founder.name}</span>
                    <div>
                      {isNetReceivable && (
                        <span className="text-xs font-mono font-bold text-black bg-white border border-black px-2.5 py-0.5 rounded-md shadow-xs">
                          + {rupees(founder.receivable)} Receivable
                        </span>
                      )}
                      {isNetPayable && (
                        <span className="text-xs font-mono font-bold text-white bg-black border border-black px-2.5 py-0.5 rounded-md shadow-xs">
                          − {rupees(founder.payable)} Payable
                        </span>
                      )}
                      {isSettled && (
                        <span className="text-xs font-mono font-semibold text-neutral-600 bg-neutral-200/80 px-2 py-0.5 rounded-md">
                          Settled (₹0.00)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 pt-1 border-t border-neutral-200/60 font-mono">
                    <div>
                      <span className="text-neutral-500 block">Paid on behalf:</span>
                      <b className="text-neutral-800">{rupees(founder.paid)}</b>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Allocated share:</span>
                      <b className="text-neutral-800">{rupees(founder.allocated)}</b>
                    </div>
                    {(founder.settledPaid > 0 || founder.settledReceived > 0) && (
                      <div className="col-span-2 flex justify-between text-[10px] text-neutral-500 pt-1">
                        <span>Settled out: {rupees(founder.settledPaid)}</span>
                        <span>Settled in: {rupees(founder.settledReceived)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* PAIRWISE REIMBURSEMENT OBLIGATIONS */}
      <div className="han-card space-y-3 bg-white border-neutral-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-1.5 text-black">
            <span>🤝 Pairwise Reimbursement Obligations</span>
          </h3>
          <span className="text-xs font-mono text-neutral-500">
            {pairwise.length} active
          </span>
        </div>

        {pairwise.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-neutral-100 rounded-xl text-neutral-800 text-xs border border-neutral-200">
            <CheckCircle2 size={16} className="text-black" />
            <span>All founder reimbursement obligations are fully reconciled and settled.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {pairwise.map((pair, index) => (
              <div
                key={`${pair.debtorId}-${pair.creditorId}-${index}`}
                className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs"
              >
                <div>
                  <p className="font-semibold text-neutral-900">
                    <span className="text-black font-bold">{pair.debtorName}</span> owes{" "}
                    <span className="text-black font-bold">{pair.creditorName}</span>
                  </p>
                  <p className="font-mono font-bold text-sm text-neutral-950 mt-0.5">
                    {rupees(pair.amount)}
                  </p>
                </div>
                {canManageFinance && (
                  <button
                    className="action text-xs font-semibold bg-neutral-900 text-white px-3 py-1.5 rounded-lg hover:bg-black transition-colors"
                    onClick={() =>
                      onAdd("settlements", {
                        payerId: pair.debtorId,
                        recipientId: pair.creditorId,
                        amount: pair.amount,
                        date: today(),
                      })
                    }
                  >
                    Settle Debt
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SETTLEMENT PAYMENT HISTORY */}
      <details className="han-card">
        <summary className="font-semibold cursor-pointer min-h-11 flex items-center justify-between text-sm">
          <span>Reimbursement Settlements History ({settlements.length})</span>
        </summary>
        <p className="text-xs text-neutral-500 mb-3">
          Recorded peer-to-peer repayments between founders.
        </p>
        {settlements.length === 0 ? (
          <p className="text-xs text-neutral-500">No reimbursement settlements recorded yet.</p>
        ) : (
          <div className="space-y-2 border-t pt-2">
            {settlements.map((set) => {
              const payerName =
                app.state.users.find((u) => u.id === set.payerId)?.name || set.payerId;
              const recName =
                app.state.users.find((u) => u.id === set.recipientId)?.name || set.recipientId;
              return (
                <div key={set.id} className="p-2.5 bg-neutral-50 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>
                      {payerName} → {recName}
                    </span>
                    <span className="font-mono text-black font-bold">{rupees(set.amount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-neutral-500">
                    <span>{dateLabel(String(set.date))}</span>
                    {set.paymentReference && <span>Ref: {set.paymentReference}</span>}
                  </div>
                  {set.notes && <p className="text-[11px] text-neutral-600">{set.notes}</p>}
                </div>
              );
            })}
          </div>
        )}
      </details>

      {/* TEAM SALARY ALLOTMENTS OVERVIEW */}
      <div className="han-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-black" />
            <h3 className="font-semibold text-sm">Team Monthly Salaries</h3>
          </div>
          <span className="text-xs text-neutral-500 font-mono">
            Total payouts: {rupees(finance?.salaries || 0)}
          </span>
        </div>
        <div className="space-y-2 text-xs border-t pt-2">
          {app.state.team_members.length === 0 ? (
            <p className="text-neutral-500">
              No team profiles added yet. Add team members to assign monthly salaries.
            </p>
          ) : (
            app.state.team_members.map((member) => {
              const memberPayments = app.state.salary_payments.filter(
                (s) =>
                  String(s.name).toLowerCase() === String(member.name).toLowerCase(),
              );
              const totalPaidToMember = memberPayments.reduce(
                (sum, p) => sum + Number(p.amount || 0),
                0,
              );
              return (
                <div
                  key={member.id}
                  className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1"
                >
                  <div className="flex items-center justify-between font-semibold text-sm">
                    <span>{member.name}</span>
                    <span className="text-black font-mono font-bold">
                      {member.salary ? `${rupees(Number(member.salary))} / mo` : "Unassigned"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                    <span>Role: {member.role}</span>
                    <span className="font-mono">
                      Paid: {rupees(totalPaidToMember)} ({memberPayments.length} payouts)
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SALARY PAYMENT HISTORY */}
      <details className="han-card">
        <summary className="font-semibold cursor-pointer min-h-11 flex items-center text-sm">
          Salary Payment History ({app.state.salary_payments.length})
        </summary>
        <p className="text-xs text-neutral-500 mb-3">
          Recorded salary distributions. Total recorded: {rupees(finance?.salaries || 0)}.
        </p>
        {app.state.salary_payments.length === 0 ? (
          <p className="text-xs text-neutral-500">No salary payments recorded.</p>
        ) : (
          app.state.salary_payments.map((item) => (
            <div className="border-t py-2.5 text-xs" key={item.id}>
              <div className="flex justify-between font-semibold">
                <span>{String(item.name)}</span>
                <span className="font-mono">{rupees(Number(item.amount))}</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                {dateLabel(String(item.date))} · From spendable funds
              </p>
              {!!item.notes && <p className="text-neutral-600 mt-1">{String(item.notes)}</p>}
              {isOwner && (
                <div className="flex gap-2 mt-1.5">
                  <button className="action underline text-xs" onClick={() => onEdit(item)}>
                    Correct record
                  </button>
                  <button className="action underline text-xs" onClick={() => onDelete(item)}>
                    Delete record
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </details>

      {/* SAVINGS HISTORY */}
      <details className="han-card">
        <summary className="font-semibold cursor-pointer min-h-11 flex items-center text-sm">
          Savings History ({app.state.savings_entries.length})
        </summary>
        {app.state.savings_entries.length === 0 ? (
          <p className="text-xs text-neutral-500">No funds moved into savings yet.</p>
        ) : (
          app.state.savings_entries.map((item) => (
            <div className="border-t py-2.5 text-xs" key={item.id}>
              <div className="flex justify-between font-semibold">
                <span>{String(item.title)}</span>
                <span className="font-mono text-black font-bold">{rupees(Number(item.amount))}</span>
              </div>
              <p className="text-[11px] text-neutral-500">
                {dateLabel(String(item.date))} · Protected reserve
              </p>
              {!!item.notes && <p className="text-neutral-600 mt-1">{String(item.notes)}</p>}
            </div>
          ))
        )}
      </details>
    </section>
  );
}
