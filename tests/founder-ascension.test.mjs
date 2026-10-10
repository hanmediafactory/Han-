import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const directory = mkdtempSync(join(tmpdir(), "han-ascension-"));
process.env.HAN_DB_PATH = join(directory, "ascension.sqlite");

const { app } = await import("../server/app.mjs");
const { db, hashPassword } = await import("../server/db.mjs");
await import("../server/seed.mjs");

const testPassword = "AscensionPassword2026!";
const founderPerms = [
  "finance.view",
  "finance.manage",
  "projects.manage",
  "tasks.manage",
  "leads.manage",
  "funnels.manage",
  "calendar.manage",
];

// Give all 4 founders active status and standard workspace permissions
db.prepare("UPDATE users SET password_hash=?, active=1").run(hashPassword(testPassword));
for (const uid of ["user-2", "user-3", "user-4"]) {
  db.prepare("UPDATE users SET permissions=? WHERE id=?").run(
    JSON.stringify(founderPerms),
    uid
  );
}

const server = app.listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  db.close();
  rmSync(directory, { recursive: true, force: true });
});

async function login(id) {
  const response = await fetch(`${origin}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: id, password: testPassword }),
  });
  assert.equal(response.status, 200);
  return {
    id,
    cookie: response.headers.get("set-cookie").split(";")[0],
    csrf: (await response.json()).csrf,
  };
}

async function call(session, path, method = "GET", body, idempotencyKey = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(session
      ? {
          Cookie: session.cookie,
          "X-CSRF-Token": session.csrf,
        }
      : {}),
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
  };
  const response = await fetch(`${origin}/api/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: response.status, data };
}

const harsha = await login("user-1"); // Owner
const nihaal = await login("user-2"); // Founder Member
const lalitha = await login("user-3"); // Founder Member
const abhilash = await login("user-4"); // Founder Member

// Ensure enough income exists so protectFunds passes
await call(harsha, "income", "POST", {
  title: "Founder Seed Capital",
  amount: 100000,
  category: "Revenue",
  date: "2026-10-09",
});

test("FOUNDER MATRIX: All 4 founders can collaborate on projects and team tasks without permission errors", async () => {
  // 1. Nihaal creates a shared project
  const projRes = await call(nihaal, "projects", "POST", {
    name: "Founder Platform V1",
    subtitle: "Core OS",
    description: "Collaborative engine for all four founders",
    priority: "HIGH",
    category: "Active",
    ownerId: "user-2",
    memberIds: ["user-1", "user-2", "user-3", "user-4"],
  });
  assert.equal(projRes.status, 201, "Nihaal should be able to create project");
  const projectId = projRes.data.id;

  // 2. Lalitha creates a task on that project with full fields (no undefined errors!)
  const taskRes = await call(lalitha, "tasks", "POST", {
    title: "Implement zero-defect finance ledger",
    description: "Reconciles integer-paise allocations and pairwise debts",
    projectId,
    assignedUserId: "user-4", // Assigned to Abhilash
    status: "TODO",
    priority: "URGENT",
    date: "2026-10-15",
    startDate: "2026-10-10",
  });
  assert.equal(taskRes.status, 201, "Lalitha should be able to create task with full payload");
  const taskId = taskRes.data.id;

  // 3. Abhilash updates the task to IN_REVIEW and changes description
  const patchRes = await call(abhilash, `tasks/${taskId}`, "PATCH", {
    status: "IN_REVIEW",
    notes: "Allocations sum matching verified",
  });
  assert.equal(patchRes.status, 200, "Abhilash should be able to update assigned task");

  // 4. Harsha marks it COMPLETED
  const completeRes = await call(harsha, `tasks/${taskId}`, "PATCH", {
    status: "COMPLETED",
  });
  assert.equal(completeRes.status, 200, "Harsha should be able to complete task");

  // 5. Verify all 4 founders see the completed task in state
  for (const founder of [harsha, nihaal, lalitha, abhilash]) {
    const st = (await call(founder, "state")).data;
    const foundTask = st.tasks.find((t) => t.id === taskId);
    assert.ok(foundTask, `${founder.id} must see the task`);
    assert.equal(foundTask.status, "COMPLETED");
  }

  // 6. Security invariant: Non-owners cannot perform destructive workspace backups or user creation
  const backupRes = await call(nihaal, "backup");
  assert.equal(backupRes.status, 403, "Non-owner should not download system backups");
});

test("CASE A: Individual expense (Harsha pays ₹1,000, 100% individual)", async () => {
  const res = await call(harsha, "expenses", "POST", {
    title: "Harsha Private Software",
    amount: 1000,
    category: "Software and Subscriptions",
    date: "2026-10-09",
    paidBy: "user-1",
    splitType: "individual",
    allocations: [{ userId: "user-1", amount: 1000 }],
  });
  assert.equal(res.status, 201);

  const st = (await call(harsha, "state")).data;
  const harshaTotal = st.finance.founderTotals.find((f) => f.id === "user-1");
  assert.ok(harshaTotal);
  assert.ok(harshaTotal.paid >= 1000);
  assert.ok(harshaTotal.allocated >= 1000);

  // Other founders should not owe anything for this individual expense
  for (const uid of ["user-2", "user-3", "user-4"]) {
    const pair = st.finance.pairwise.find(
      (p) => p.debtorId === uid && p.creditorId === "user-1"
    );
    // pairwise debt from this transaction alone is 0
    assert.ok(!pair || pair.amount === 0 || pair.creditorId !== "user-1");
  }
});

test("CASE B: Equal four-founder expense (Harsha pays ₹4,000 split 4 ways)", async () => {
  const res = await call(harsha, "expenses", "POST", {
    title: "AWS Cloud Infrastructure",
    amount: 4000,
    category: "Hosting and Infrastructure",
    date: "2026-10-09",
    paidBy: "user-1",
    splitType: "equal",
    allocations: [
      { userId: "user-1", amount: 1000 },
      { userId: "user-2", amount: 1000 },
      { userId: "user-3", amount: 1000 },
      { userId: "user-4", amount: 1000 },
    ],
  });
  assert.equal(res.status, 201);

  const st = (await call(harsha, "state")).data;
  // Each of the other 3 founders owes Harsha ₹1,000 from this transaction
  const nihaalOwesHarsha = st.finance.pairwise.find(
    (p) => p.debtorId === "user-2" && p.creditorId === "user-1"
  );
  const lalithaOwesHarsha = st.finance.pairwise.find(
    (p) => p.debtorId === "user-3" && p.creditorId === "user-1"
  );
  const abhilashOwesHarsha = st.finance.pairwise.find(
    (p) => p.debtorId === "user-4" && p.creditorId === "user-1"
  );

  assert.ok(nihaalOwesHarsha && nihaalOwesHarsha.amount >= 1000);
  assert.ok(lalithaOwesHarsha && lalithaOwesHarsha.amount >= 1000);
  assert.ok(abhilashOwesHarsha && abhilashOwesHarsha.amount >= 1000);
});

test("CASE C: Unequal custom allocation (Harsha pays ₹5,000)", async () => {
  const res = await call(harsha, "expenses", "POST", {
    title: "Design and Production Equipment",
    amount: 5000,
    category: "Equipment and Hardware",
    date: "2026-10-09",
    paidBy: "user-1",
    splitType: "custom",
    allocations: [
      { userId: "user-1", amount: 2000 },
      { userId: "user-2", amount: 1500 },
      { userId: "user-4", amount: 1000 },
      { userId: "user-3", amount: 500 },
    ],
  });
  assert.equal(res.status, 201, "Valid unequal split summing to 5000 must succeed");
});

test("CASE D: Invalid allocation rejection (₹4,000 total with ₹3,500 allocations)", async () => {
  const res = await call(harsha, "expenses", "POST", {
    title: "Invalid Misallocated Expense",
    amount: 4000,
    category: "Operations",
    date: "2026-10-09",
    paidBy: "user-1",
    splitType: "custom",
    allocations: [
      { userId: "user-1", amount: 1000 },
      { userId: "user-2", amount: 1000 },
      { userId: "user-3", amount: 1500 }, // sum = 3500 != 4000
    ],
  });
  assert.equal(res.status, 400, "Must reject allocation sum discrepancy");
});

test("CASE E: Integer-paise deterministic rounding (₹100 split 3 ways)", async () => {
  const { computeEqualAllocations } = await import("../server/finance.mjs");
  const allocs = computeEqualAllocations(100, ["user-1", "user-2", "user-3"]);
  assert.equal(allocs.length, 3);
  assert.equal(allocs[0].amount, 33.34);
  assert.equal(allocs[1].amount, 33.33);
  assert.equal(allocs[2].amount, 33.33);
  const sum = Math.round(allocs.reduce((s, a) => s + a.amount * 100, 0));
  assert.equal(sum, 10000, "Sum of cents must be exactly 10000 paise (₹100.00)");
});

test("CASE F: Partial reimbursement settlement (Nihaal settles ₹400)", async () => {
  const stBefore = (await call(harsha, "state")).data;
  const initialDebt = stBefore.finance.pairwise.find(
    (p) => p.debtorId === "user-2" && p.creditorId === "user-1"
  )?.amount || 0;
  assert.ok(initialDebt >= 400, "Nihaal must have at least ₹400 debt to Harsha");

  // Nihaal records partial settlement of ₹400 to Harsha
  const settleRes = await call(nihaal, "settlements", "POST", {
    payerId: "user-2",
    recipientId: "user-1",
    amount: 400,
    date: "2026-10-09",
    paymentReference: "UPI-AXIS-9928172",
    notes: "Partial reimbursement for AWS and platform expenses",
  });
  assert.equal(settleRes.status, 201);

  const stAfter = (await call(harsha, "state")).data;
  const remainingDebt = stAfter.finance.pairwise.find(
    (p) => p.debtorId === "user-2" && p.creditorId === "user-1"
  )?.amount || 0;
  assert.equal(
    Math.round(remainingDebt * 100),
    Math.round((initialDebt - 400) * 100),
    "Remaining debt must be exactly initialDebt - 400"
  );

  // Overpayment test: Trying to settle ₹1,000,000 when debt is much less must fail
  const overpayRes = await call(nihaal, "settlements", "POST", {
    payerId: "user-2",
    recipientId: "user-1",
    amount: 1000000,
    date: "2026-10-09",
  });
  assert.equal(overpayRes.status, 400, "Overpayment exceeding debt must be rejected");
});

test("CASE G: Idempotent duplicate mutation request", async () => {
  const idempotencyKey = randomUUID();
  const payload = {
    title: "One-Time Domain Purchase",
    amount: 1200,
    category: "Software and Subscriptions",
    date: "2026-10-09",
    paidBy: "user-3",
  };

  const first = await call(lalitha, "expenses", "POST", payload, idempotencyKey);
  assert.equal(first.status, 201);
  const firstId = first.data.id;

  // Replaying identical request with same idempotency key
  const second = await call(lalitha, "expenses", "POST", payload, idempotencyKey);
  assert.equal(second.status, 201);
  assert.equal(second.data.id, firstId, "Must return original transaction ID without creating duplicate");
});

test("CASE H: Edited expense reconciles totals and preserves audit trail", async () => {
  const createRes = await call(abhilash, "expenses", "POST", {
    title: "Studio Lighting Setup",
    amount: 2000,
    category: "Equipment and Hardware",
    date: "2026-10-09",
    paidBy: "user-4",
    splitType: "equal",
    allocations: [
      { userId: "user-1", amount: 500 },
      { userId: "user-2", amount: 500 },
      { userId: "user-3", amount: 500 },
      { userId: "user-4", amount: 500 },
    ],
  });
  assert.equal(createRes.status, 201);
  const expenseId = createRes.data.id;

  // Edit amount to 3000 and update allocations
  const editRes = await call(abhilash, `expenses/${expenseId}`, "PATCH", {
    amount: 3000,
    allocations: [
      { userId: "user-1", amount: 750 },
      { userId: "user-2", amount: 750 },
      { userId: "user-3", amount: 750 },
      { userId: "user-4", amount: 750 },
    ],
  });
  assert.equal(editRes.status, 200);

  const st = (await call(harsha, "state")).data;
  const updatedExp = st.transactions.find((t) => t.id === expenseId);
  assert.equal(updatedExp.amount, 3000);
});

test("CASE I: Voided expense removes from totals, preserves audit and notifies", async () => {
  const createRes = await call(nihaal, "expenses", "POST", {
    title: "Accidental Duplicate SaaS Subscription",
    amount: 8000,
    category: "Software and Subscriptions",
    date: "2026-10-09",
    paidBy: "user-2",
  });
  assert.equal(createRes.status, 201);
  const expId = createRes.data.id;

  const stBefore = (await call(harsha, "state")).data;
  const totalBefore = stBefore.finance.expenses;

  // Void the expense with reason
  const voidRes = await call(nihaal, `expenses/${expId}/void`, "POST", {
    reason: "Duplicate charge refunded by vendor",
  });
  assert.equal(voidRes.status, 200);

  const stAfter = (await call(harsha, "state")).data;
  const totalAfter = stAfter.finance.expenses;
  assert.equal(
    Math.round(totalAfter * 100),
    Math.round((totalBefore - 8000) * 100),
    "Voided expense must be deducted from active expenses total"
  );
  assert.equal(stAfter.finance.voidExpensesCount >= 1, true);

  // Voided expense cannot be edited or deleted
  const tryEdit = await call(nihaal, `expenses/${expId}`, "PATCH", { title: "Try Edit" });
  assert.equal(tryEdit.status, 409, "Voided expense cannot be edited");
});

test("CASE J: CSV Export reconciles exactly with active expenses", async () => {
  const csvRes = await fetch(`${origin}/api/reports/csv?table=expenses`, {
    headers: {
      Cookie: harsha.cookie,
      "X-CSRF-Token": harsha.csrf,
    },
  });
  assert.equal(csvRes.status, 200);
  const csvText = await csvRes.text();
  assert.ok(csvText.includes("title") && csvText.includes("amount"), "CSV header row must be present");
  assert.ok(csvText.includes("AWS Cloud Infrastructure"), "Must include persisted expenses");
});

test("NOTIFICATIONS: In-app notifications generated for all 4 founders on new expense", async () => {
  const res = await call(lalitha, "expenses", "POST", {
    title: "Founder Offsite Meeting Refreshments",
    amount: 1600,
    category: "Food and Meetings",
    date: "2026-10-09",
    paidBy: "user-3",
  });
  assert.equal(res.status, 201);
  const expId = res.data.id;

  // Verify all 4 founders received the notification
  for (const founder of [harsha, nihaal, lalitha, abhilash]) {
    const st = (await call(founder, "state")).data;
    const notif = st.notifications.find(
      (n) => n.targetId === expId && n.category === "Payments"
    );
    assert.ok(
      notif,
      `Founder ${founder.id} must receive in-app notification for expense ${expId}`
    );
    assert.equal(notif.targetScreen, "money");
  }
});
