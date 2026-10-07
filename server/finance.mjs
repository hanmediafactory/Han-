import { db } from "./db.mjs";
const cents = table => db.prepare(`SELECT data FROM ${table}`).all().reduce((sum, row) => sum + Math.round(JSON.parse(row.data).amount * 100), 0);
export function financeSummary() {
  const income = cents("income"), expenses = cents("expenses"), savings = cents("savings_entries");
  const funds = income - expenses - savings;
  return { income: income / 100, expenses: expenses / 100, savings: savings / 100, funds: funds / 100, total: (funds + savings) / 100, salaries: db.prepare("SELECT data FROM salary_payments").all().reduce((sum, row) => sum + Math.round(JSON.parse(row.data).amount * 100), 0) / 100 };
}
export function protectFunds(previousFunds = 0) {
  if (financeSummary().funds < Math.min(0, previousFunds)) throw Object.assign(new Error("Insufficient spendable funds. Savings are protected and cannot pay expenses or salaries. Add income first."), { status: 409 });
}
