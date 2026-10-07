import { resolve, join } from "node:path";
import { mkdirSync } from "node:fs";
if (process.env.NODE_ENV === "production") throw new Error("The demo workspace must not run in production.");
const folder = resolve("work/demo");
mkdirSync(folder, { recursive: true });
process.env.HAN_DB_PATH = join(folder, "han-demo.sqlite");
process.env.HAN_DEMO = "1";
process.env.PORT = "3102";
const { db, hashPassword, transaction } = await import("../server/db.mjs");
await import("../server/seed.mjs");
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const offset = days => new Date(Date.parse(`${day}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
if (!db.prepare("SELECT id FROM schema_migrations WHERE id='demo-workspace-v2'").get()) transaction(() => {
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET password_hash=?").run(hashPassword("DemoOnly2026!"));
  db.prepare("UPDATE users SET permissions=? WHERE id='user-2'").run(JSON.stringify(["calendar.manage", "leads.manage"]));
  const save = (table, id, data, extras = {}) => {
    const fields = ["id", "data", "created_at", "updated_at", "created_by", "updated_by", ...Object.keys(extras)];
    db.prepare(`INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`).run(id, JSON.stringify(data), now, now, "user-1", "user-1", ...Object.values(extras));
  };
  const tasks = [
    ["demo-task-1", "Review mobile dashboard", "proj-1", "user-1", day, "IN_PROGRESS", "HIGH"],
    ["demo-task-2", "Ship review QR preview", "proj-1", "user-2", offset(-1), "TODO", "HIGH"],
    ["demo-task-3", "Approve client copy", "proj-1", "user-1", day, "COMPLETED", "MEDIUM"],
    ["demo-task-4", "Prepare AR dish assets", "proj-2", "user-3", offset(2), "TODO", "MEDIUM"],
    ["demo-task-5", "Verify repair booking flow", "proj-3", "user-2", day, "IN_PROGRESS", "HIGH"],
    ["demo-task-6", "Old design exploration", "proj-4", "user-3", day, "CANCELLED", "LOW"],
  ];
  for (const [id, title, projectId, assignedUserId, date, status, priority] of tasks) save("tasks", id, { title, projectId, assignedUserId, date, status, priority, description: "Sample task for testing shared updates, permissions and completion.", timeSlot: "", notes: "Demo record", startDate: "", estimatedTime: 30 }, { project_id: projectId, assigned_user: assignedUserId });
  for (const row of db.prepare("SELECT id,data FROM projects").all()) {
    const project = JSON.parse(row.data), scoped = tasks.filter(task => task[2] === row.id && task[5] !== "CANCELLED");
    project.progress = scoped.length ? Math.round(scoped.filter(task => task[5] === "COMPLETED").length / scoped.length * 100) : 0;
    project.manualProgress = 0; project.progressSource = scoped.length ? "tasks" : "manual"; project.deadline = offset(3);
    db.prepare("UPDATE projects SET data=? WHERE id=?").run(JSON.stringify(project), row.id);
  }
  save("income", "demo-income-1", { title: "Client project deposit", amount: 100000, category: "Revenue", date: day, notes: "Demo income" });
  save("expenses", "demo-expense-1", { title: "Hosting and tools", amount: 5000, category: "Operations", date: day, notes: "Demo expense" });
  save("savings_entries", "demo-savings-1", { title: "Protected reserve", amount: 30000, date: day, notes: "Excluded from spendable funds" });
  save("salary_payments", "demo-salary-1", { name: "Nihaal", amount: 10000, date: day, notes: "Manual demo payment", expenseId: "demo-expense-salary" });
  save("expenses", "demo-expense-salary", { title: "Salary · Nihaal", amount: 10000, date: day, category: "Salary", notes: "Manual demo payment", salaryPaymentId: "demo-salary-1" });
  for (const [index, name, status, nextAction] of [[1, "Café Lotus", "Follow Up", "Send the proposal"], [2, "Bright Dental", "Interested", "Confirm a demo"], [3, "North Studio", "Won", "Start onboarding"]]) save("leads", `demo-lead-${index}`, { name, status, nextAction, category: "Service", email: `demo${index}@example.com`, phone: "", dealValue: index * 12000, source: "Referral", followUpDate: index === 1 ? day : "", assignedUserId: "user-2" });
  save("calendar_events", "demo-event-1", { title: "Client review call", date: day, assignedUserId: "user-1", notes: "Use the calendar to verify task dates match." }, { assigned_user: "user-1" });
  save("funnels", "demo-funnel-1", { title: "Client acquisition", subtitle: "Demo pipeline", description: "Track the work from contact to delivery", steps: [{ id: 1, title: "First contact", status: "Completed" }, { id: 2, title: "Proposal", status: "In Progress" }, { id: 3, title: "Delivery", status: "Pending" }] });
  for (const [id, name, role] of [[1, "Harsha", "Owner"], [2, "Nihaal", "Developer"], [3, "Lalitha", "Designer"]]) save("team_members", `demo-team-${id}`, { name, role, initials: name[0], sharePercentage: "" });
  db.prepare("INSERT INTO schema_migrations VALUES (?,?)").run("demo-workspace-v2", now);
});
// A newly added demo account is provisioned without resetting saved demo edits.
if (db.prepare("SELECT id FROM users WHERE id='user-4' AND password_hash IS NULL").get()) {
  db.prepare("UPDATE users SET password_hash=? WHERE id='user-4'").run(hashPassword("DemoOnly2026!"));
}
await import("../server/index.mjs");
