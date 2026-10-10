import { db } from "./db.mjs";

const round2 = (val) => Math.round(val * 100) / 100;

export function getActiveExpenses() {
  return db
    .prepare("SELECT * FROM expenses ORDER BY created_at DESC, id")
    .all()
    .map((row) => ({
      ...JSON.parse(row.data),
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      updated_by: row.updated_by,
    }))
    .filter((e) => e.status !== "void");
}

export function getAllSettlements() {
  try {
    return db
      .prepare("SELECT * FROM settlements ORDER BY created_at DESC, id")
      .all()
      .map((row) => ({
        ...JSON.parse(row.data),
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        updated_by: row.updated_by,
      }));
  } catch {
    return [];
  }
}

export function financeSummary() {
  const incomeCents = db
    .prepare("SELECT data FROM income")
    .all()
    .reduce((sum, row) => sum + Math.round(JSON.parse(row.data).amount * 100), 0);

  const activeExpenses = getActiveExpenses();
  const allExpensesRows = db.prepare("SELECT data FROM expenses").all();
  const voidExpensesCount = allExpensesRows.filter(
    (r) => JSON.parse(r.data).status === "void",
  ).length;

  const expensesCents = activeExpenses.reduce(
    (sum, e) => sum + Math.round(e.amount * 100),
    0,
  );

  const savingsCents = db
    .prepare("SELECT data FROM savings_entries")
    .all()
    .reduce((sum, row) => sum + Math.round(JSON.parse(row.data).amount * 100), 0);

  const salariesCents = db
    .prepare("SELECT data FROM salary_payments")
    .all()
    .reduce((sum, row) => sum + Math.round(JSON.parse(row.data).amount * 100), 0);

  const fundsCents = incomeCents - expensesCents - savingsCents;

  // Founder ledger breakdown
  const users = db.prepare("SELECT id, name FROM users ORDER BY id").all();
  const settlements = getAllSettlements();

  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.HAN_TIMEZONE || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  let currentMonthExpensesCents = 0;
  let individualSpendingCents = 0;
  let sharedSpendingCents = 0;
  let missingReceiptsCount = 0;
  const categoryBreakdownCents = {};
  const subcategoryBreakdownCents = {};

  // Track raw debts between pairs: debt[debtor][creditor] in cents
  const debtMatrix = {};
  for (const u1 of users) {
    debtMatrix[u1.id] = {};
    for (const u2 of users) {
      debtMatrix[u1.id][u2.id] = 0;
    }
  }

  const founderTotalsMap = {};
  for (const u of users) {
    founderTotalsMap[u.id] = {
      id: u.id,
      name: u.name,
      paidCents: 0,
      allocatedCents: 0,
      settledPaidCents: 0,
      settledReceivedCents: 0,
    };
  }

  for (const exp of activeExpenses) {
    const expCents = Math.round(exp.amount * 100);
    const payerId = exp.paidBy || exp.created_by || "user-1";

    if (exp.date && exp.date.startsWith(currentMonth)) {
      currentMonthExpensesCents += expCents;
    }

    if (!exp.receipt || String(exp.receipt).trim() === "") {
      missingReceiptsCount++;
    }

    const cat = exp.category || "Miscellaneous";
    categoryBreakdownCents[cat] = (categoryBreakdownCents[cat] || 0) + expCents;

    if (exp.subcategory) {
      subcategoryBreakdownCents[exp.subcategory] =
        (subcategoryBreakdownCents[exp.subcategory] || 0) + expCents;
    }

    if (founderTotalsMap[payerId]) {
      founderTotalsMap[payerId].paidCents += expCents;
    }

    const allocations = Array.isArray(exp.allocations) && exp.allocations.length
      ? exp.allocations
      : [{ userId: payerId, amount: exp.amount }];

    if (
      allocations.length === 1 &&
      allocations[0].userId === payerId
    ) {
      individualSpendingCents += expCents;
    } else {
      sharedSpendingCents += expCents;
    }

    for (const alloc of allocations) {
      const aCents = Math.round(alloc.amount * 100);
      if (founderTotalsMap[alloc.userId]) {
        founderTotalsMap[alloc.userId].allocatedCents += aCents;
      }
      if (alloc.userId !== payerId && debtMatrix[alloc.userId]) {
        debtMatrix[alloc.userId][payerId] =
          (debtMatrix[alloc.userId][payerId] || 0) + aCents;
      }
    }
  }

  // Adjust for settlements
  for (const set of settlements) {
    const sCents = Math.round(set.amount * 100);
    if (founderTotalsMap[set.payerId]) {
      founderTotalsMap[set.payerId].settledPaidCents += sCents;
    }
    if (founderTotalsMap[set.recipientId]) {
      founderTotalsMap[set.recipientId].settledReceivedCents += sCents;
    }
    if (debtMatrix[set.payerId]) {
      debtMatrix[set.payerId][set.recipientId] =
        (debtMatrix[set.payerId][set.recipientId] || 0) - sCents;
    }
  }

  const founderTotals = users.map((u) => {
    const data = founderTotalsMap[u.id];
    const paid = round2(data.paidCents / 100);
    const allocated = round2(data.allocatedCents / 100);
    const settledPaid = round2(data.settledPaidCents / 100);
    const settledReceived = round2(data.settledReceivedCents / 100);
    const netPosition = round2((data.paidCents - data.allocatedCents) / 100);
    const outstandingCents =
      data.paidCents - data.allocatedCents + data.settledPaidCents - data.settledReceivedCents;
    const outstanding = round2(outstandingCents / 100);

    return {
      id: u.id,
      name: u.name,
      paid,
      allocated,
      settledPaid,
      settledReceived,
      netPosition,
      outstanding,
      receivable: outstanding > 0 ? outstanding : 0,
      payable: outstanding < 0 ? Math.abs(outstanding) : 0,
    };
  });

  // Calculate pairwise debts
  const pairwise = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      const u1 = users[i];
      const u2 = users[j];
      const u1OwesU2 = debtMatrix[u1.id][u2.id] || 0;
      const u2OwesU1 = debtMatrix[u2.id][u1.id] || 0;
      const netCents = u1OwesU2 - u2OwesU1;

      if (netCents > 0) {
        pairwise.push({
          debtorId: u1.id,
          debtorName: u1.name,
          creditorId: u2.id,
          creditorName: u2.name,
          amount: round2(netCents / 100),
        });
      } else if (netCents < 0) {
        pairwise.push({
          debtorId: u2.id,
          debtorName: u2.name,
          creditorId: u1.id,
          creditorName: u1.name,
          amount: round2(Math.abs(netCents) / 100),
        });
      }
    }
  }

  const categoryBreakdown = {};
  for (const [k, v] of Object.entries(categoryBreakdownCents)) {
    categoryBreakdown[k] = round2(v / 100);
  }

  const subcategoryBreakdown = {};
  for (const [k, v] of Object.entries(subcategoryBreakdownCents)) {
    subcategoryBreakdown[k] = round2(v / 100);
  }

  return {
    income: round2(incomeCents / 100),
    expenses: round2(expensesCents / 100),
    savings: round2(savingsCents / 100),
    funds: round2(fundsCents / 100),
    total: round2((fundsCents + savingsCents) / 100),
    salaries: round2(salariesCents / 100),
    currentMonthExpenses: round2(currentMonthExpensesCents / 100),
    individualSpending: round2(individualSpendingCents / 100),
    sharedSpending: round2(sharedSpendingCents / 100),
    activeExpensesCount: activeExpenses.length,
    voidExpensesCount,
    missingReceiptsCount,
    categoryBreakdown,
    subcategoryBreakdown,
    founderTotals,
    pairwise,
  };
}

export function getPairwiseDebt(payerId, recipientId) {
  const summary = financeSummary();
  const pair = summary.pairwise.find(
    (p) => p.debtorId === payerId && p.creditorId === recipientId,
  );
  return pair ? pair.amount : 0;
}

export function computeEqualAllocations(amount, userIds) {
  const totalCents = Math.round(amount * 100);
  const count = userIds.length;
  if (count === 0) return [];
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents % count;

  return userIds.map((userId, i) => ({
    userId,
    amount: round2((baseCents + (i < remainder ? 1 : 0)) / 100),
    percentage: round2(100 / count),
  }));
}

export function protectFunds(previousFunds = 0) {
  if (financeSummary().funds < Math.min(0, previousFunds)) {
    throw Object.assign(
      new Error(
        "Insufficient spendable funds. Savings are protected and cannot pay expenses or salaries. Add income first.",
      ),
      { status: 409 },
    );
  }
}
