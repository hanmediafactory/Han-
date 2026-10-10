import { useState, useEffect } from "react";
import type { FormEvent, ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { today, dateLabel } from "../context/dates";
import { getApiUrl } from "../utils/apiConfig";
import type { RecordData, Account, State } from "../context/AppContext";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { BottomNavigation } from "../components/ui/BottomNavigation";
import { Modal } from "../components/ui/Modal";
import { ProjectCard } from "../components/ui/ProjectCard";
import { FunnelCard } from "../components/ui/FunnelCard";
import { MoneyOverview } from "../components/ui/MoneyOverview";
import { ProgressBar } from "../components/ui/ProgressBar";
import { SearchBar } from "../components/ui/SearchBar";
import { KanbanPipeline } from "../components/ui/KanbanPipeline";
import { AuditLogStream } from "../components/ui/AuditLogStream";
import { TeamWorkspaceFeed } from "../components/ui/TeamWorkspaceFeed";
import { PushPreferences } from "../components/ui/PushPreferences";
import {
  Pencil,
  Trash2,
  Archive,
  RotateCcw,
  Check,
  ArrowRight,
  Download,
  Wallet,
  Eye,
  EyeOff,
} from "lucide-react";

type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
};
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const readable = (value: string) => ({ TODO: "To Do", IN_PROGRESS: "In Progress", BLOCKED: "Blocked", IN_REVIEW: "In Review", COMPLETED: "Completed", CANCELLED: "Cancelled", LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" }[value] || value);
const fields: Record<string, Field[]> = {
  savings_entries: [
    { key: "title", label: "Savings purpose", required: true },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  salary_payments: [
    { key: "name", label: "Paid to", required: true },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "date", label: "Payment date", type: "date", required: true },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  projects: [
    { key: "name", label: "Project name", required: true },
    { key: "subtitle", label: "Subtitle" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "deadline", label: "Deadline (optional)", type: "date" },
    { key: "priority", label: "Priority", options: priorities },
    { key: "category", label: "Status", options: ["Active", "Completed"] },
    { key: "progress", label: "Estimated progress without tasks (%)", type: "number" },
    { key: "ownerId", label: "Project owner", type: "user" },
    { key: "memberIds", label: "Assigned members", type: "members" },
    { key: "notes", label: "Notes", type: "textarea" },
    { key: "repoUrl", label: "Repository URL", type: "url" },
    { key: "previewUrl", label: "Preview URL", type: "url" },
    { key: "docsUrl", label: "Documentation URL", type: "url" },
  ],
  tasks: [
    { key: "title", label: "Task title", required: true },
    { key: "description", label: "Description", type: "textarea" },
    { key: "projectId", label: "Project", type: "project" },
    { key: "assignedUserId", label: "Assigned user", type: "user" },
    {
      key: "status",
      label: "Status",
      options: ["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETED", "CANCELLED"],
    },
    { key: "priority", label: "Priority", options: priorities },
    { key: "date", label: "Due date", type: "date", required: true },
    { key: "startDate", label: "Start date", type: "date" },
    { key: "timeSlot", label: "Time slot" },
    { key: "estimatedTime", label: "Estimated hours", type: "number" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  expenses: [
    { key: "title", label: "Title", required: true },
    { key: "amount", label: "Amount (₹)", type: "number", required: true },
    { key: "category", label: "Category", required: true },
    { key: "subcategory", label: "Subcategory" },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "paidBy", label: "Paid by", type: "user" },
    { key: "vendor", label: "Vendor / Merchant" },
    { key: "paymentMethod", label: "Payment method", options: ["UPI", "Bank Transfer", "Credit Card", "Debit Card", "Cash"] },
    { key: "receipt", label: "Receipt / Invoice URL" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  settlements: [
    { key: "payerId", label: "Payer (who paid)", type: "user", required: true },
    { key: "recipientId", label: "Recipient (who received)", type: "user", required: true },
    { key: "amount", label: "Settlement amount (₹)", type: "number", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "paymentReference", label: "Payment Reference / UTR" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  leads: [
    { key: "name", label: "Lead name", required: true },
    { key: "category", label: "Category", required: true },
    {
      key: "status",
      label: "Status",
      options: ["New", "Contacted", "Interested", "Follow Up", "Won", "Lost"],
    },
    { key: "nextAction", label: "Next action", type: "textarea" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "dealValue", label: "Deal value (₹)", type: "number" },
    { key: "source", label: "Source" },
    { key: "followUpDate", label: "Follow-up date", type: "date" },
    { key: "assignedUserId", label: "Lead owner", type: "user" },
  ],
  funnels: [
    { key: "title", label: "Funnel title", required: true },
    { key: "subtitle", label: "Subtitle" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "steps", label: "Steps", type: "steps" },
  ],
  team_members: [
    { key: "name", label: "Name", required: true },
    { key: "role", label: "Role", required: true },
    { key: "salary", label: "Assigned Monthly Salary (₹)", type: "number" },
    { key: "sharePercentage", label: "Share / commission" },
    { key: "initials", label: "Initials", required: true },
  ],

  calendar_events: [
    { key: "title", label: "Event title", required: true },
    { key: "date", label: "Date", type: "date", required: true },
    { key: "assignedUserId", label: "Assigned user", type: "user" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
  categories: [
    { key: "name", label: "Category name", required: true },
    {
      key: "kind",
      label: "Used for",
      options: ["project", "expense", "income", "lead"],
    },
  ],
  settings: [
    { key: "name", label: "Setting name", required: true },
    { key: "value", label: "Value", required: true },
  ],
  notifications: [
    { key: "title", label: "Title", required: true },
    { key: "subtitle", label: "Message", type: "textarea" },
    { key: "userId", label: "Recipient", type: "user" },
    {
      key: "category",
      label: "Category",
      options: ["Tasks", "Projects", "Payments", "General"],
    },
    {
      key: "iconType",
      label: "Type",
      options: ["task", "lead", "payment", "project", "deadline", "team"],
    },
  ],
};
fields.income = fields.expenses;
const titleFor: Record<string, string> = {
  projects: "Projects",
  tasks: "Tasks",
  expenses: "Money",
  income: "Income",
  leads: "Leads",
  funnels: "Funnels",
  team_members: "Team",
  calendar_events: "Calendar",
  categories: "Categories",
  settings: "Settings",
  notifications: "Notifications",
};

const singularTitleFor: Record<string, string> = {
  savings_entries: "Savings Transfer",
  salary_payments: "Salary Payment",
  projects: "Project",
  tasks: "Task",
  expenses: "Expense",
  income: "Income Entry",
  leads: "Lead",
  funnels: "Funnel",
  team_members: "Team Member",
  calendar_events: "Calendar Event",
  categories: "Category",
  settings: "Setting",
  notifications: "Notification",
};

function defaults(table: string, userId: string) {
  return {
    name: "",
    title: "",
    description: "",
    subtitle: "",
    date: today(),
    deadline: "",
    startDate: "",
    timeSlot: "",
    notes: "",
    nextAction: "",
    amount: "",
    email: "",
    phone: "",
    dealValue: 0,
    source: "Inbound",
    followUpDate: "",
    category:
      table === "projects"
        ? "Active"
        : table === "notifications"
          ? "General"
          : "General",
    priority: "MEDIUM",
    status: table === "leads" ? "New" : "TODO",
    progress: 0,
    estimatedTime: 0,
    ownerId: "user-1",
    assignedUserId: userId,
    userId,
    memberIds: ["user-1"],
    steps: [],
    archived: false,
    read: false,
    iconType: "team",
    timestamp: new Date().toISOString(),
    kind: "project",
    role: "Contributor",
    initials: "",
    sharePercentage: "",
    value: "",
  };
}
function Editor({
  table,
  item,
  initialValues,
  onClose,
}: {
  table: string;
  item?: RecordData;
  initialValues?: Record<string, unknown>;
  onClose: () => void;
}) {
  const app = useApp();
  const [value, setValue] = useState<Record<string, unknown>>({
    ...defaults(table, app.user!.id),
    ...(table === "tasks" && app.activeProjectId ? { projectId: app.activeProjectId } : {}),
    ...initialValues,
    ...item,
  });
  const set = (key: string, next: unknown) =>
    setValue((v) => {
      const updated = { ...v, [key]: next };
      if (key === "projectId" && table === "tasks" && next) {
        const project = app.projects.find(p => p.id === next);
        if (project && !project.memberIds?.includes(String(v.assignedUserId))) updated.assignedUserId = project.memberIds?.[0] || app.user!.id;
      }
      return updated;
    });

  const canManageTasks = app.can("tasks.manage");
  const memberTask = table === "tasks" && !canManageTasks && !!item;

  const activeFounders = app.state.users.filter((u) => u.active);
  const [splitType, setSplitType] = useState<"equal" | "individual" | "custom">(
    (value.splitType as "equal" | "individual" | "custom") || "equal"
  );
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>(() => {
    const existing = Array.isArray(value.allocations) ? value.allocations : [];
    const map: Record<string, number> = {};
    for (const u of activeFounders) {
      const found = existing.find((a: any) => a.userId === u.id);
      map[u.id] = found ? Number(found.amount) : 0;
    }
    return map;
  });

  const totalCustom = Object.values(customAllocations).reduce(
    (sum, a) => sum + (Number(a) || 0),
    0
  );
  const expAmount = Number(value.amount) || 0;
  const discrepancyCents =
    Math.round(totalCustom * 100) - Math.round(expAmount * 100);

  const [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    // Form pre-validation with clear, specific user error messages
    if (table === "tasks") {
      if (!String(value.title || "").trim()) {
        setError("Task title is required.");
        return;
      }
      if (!value.date) {
        setError("Due date is required.");
        return;
      }
      if (value.startDate && value.date && String(value.startDate) > String(value.date)) {
        setError("Start date cannot be after the due date.");
        return;
      }
    }
    if (table === "projects") {
      if (!String(value.name || "").trim()) {
        setError("Project name is required.");
        return;
      }
      if (!Array.isArray(value.memberIds) || value.memberIds.length === 0) {
        setError("Please select at least one assigned team member.");
        return;
      }
    }
    if (table === "expenses") {
      if (!String(value.title || "").trim()) {
        setError("Expense title is required.");
        return;
      }
      if (!value.amount || Number(value.amount) <= 0) {
        setError("Expense amount must be greater than ₹0.00.");
        return;
      }
      if (!value.date) {
        setError("Date is required.");
        return;
      }
    }
    if (table === "income") {
      if (!String(value.title || "").trim()) {
        setError("Income title is required.");
        return;
      }
      if (!value.amount || Number(value.amount) <= 0) {
        setError("Income amount must be greater than ₹0.00.");
        return;
      }
      if (!value.date) {
        setError("Date is required.");
        return;
      }
    }
    if (table === "settlements") {
      if (!value.amount || Number(value.amount) <= 0) {
        setError("Settlement amount must be greater than ₹0.00.");
        return;
      }
      if (!value.payerId || !value.recipientId) {
        setError("Both payer and recipient must be selected.");
        return;
      }
      if (value.payerId === value.recipientId) {
        setError("Payer and recipient cannot be the same team member.");
        return;
      }
    }
    if (table === "leads") {
      if (!String(value.name || "").trim()) {
        setError("Lead name is required.");
        return;
      }
    }

    const data: Record<string, unknown> = {};
    for (const field of fields[table] || []) data[field.key] = value[field.key];
    if (table === "tasks" && !data.projectId) delete data.projectId;
    if (table === "projects") data.archived = value.archived;
    if (table === "notifications") {
      data.read = value.read;
      data.timestamp = value.timestamp;
    }
    if (table === "expenses") {
      data.paidBy = value.paidBy || app.user?.id;
      data.splitType = splitType;
      if (splitType === "individual") {
        data.allocations = [
          {
            userId: String(data.paidBy),
            amount: Number(data.amount),
            percentage: 100,
          },
        ];
      } else if (splitType === "custom") {
        if (discrepancyCents !== 0) {
          setError(
            `Allocations sum to ₹${totalCustom.toFixed(2)}, which does not reconcile with total amount ₹${expAmount.toFixed(2)} (difference: ₹${(Math.abs(discrepancyCents) / 100).toFixed(2)}).`
          );
          return;
        }
        data.allocations = activeFounders
          .map((u) => ({
            userId: u.id,
            amount: Number(customAllocations[u.id] || 0),
          }))
          .filter((a) => a.amount > 0);
      } else {
        const founderIds = activeFounders.map((u) => u.id);
        const count = founderIds.length || 1;
        const totalCents = Math.round(Number(data.amount) * 100);
        const base = Math.floor(totalCents / count);
        const rem = totalCents % count;
        data.allocations = founderIds.map((id, i) => ({
          userId: id,
          amount: (base + (i < rem ? 1 : 0)) / 100,
        }));
      }
    }
    if (memberTask) {
      for (const key of Object.keys(data))
        if (key !== "status") delete data[key];
    }
    const ok = await app.mutate(
      item ? `${table}/${item.id}` : table,
      item ? "PATCH" : "POST",
      data,
    );
    if (ok) onClose();
    else setError("The change was not saved. Review the error message, correct the fields, and try again.");
  };
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${item ? "Edit" : "New"} ${singularTitleFor[table] || "Item"}`}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {["expenses", "savings_entries", "salary_payments"].includes(table) && <p className="text-sm text-neutral-600">Available funds: ₹{app.totalFunds.toLocaleString("en-IN")}. Protected savings cannot be spent.</p>}
        {table === "salary_payments" && <p className="text-sm text-neutral-600">Record a salary you have paid. It deducts funds and appears once in expenses. HAN does not send money to a bank account.</p>}
        {table === "savings_entries" && <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1" />I understand this moves funds into protected savings and cannot be withdrawn or deleted in HAN.</label>}
        {table === "projects" && <p className="text-sm text-neutral-600">Progress is calculated from completed, non-cancelled tasks. Without tasks, it uses your estimate. Leave the deadline blank if it is not yet agreed.</p>}
        {fields[table]
          .filter((f) => !memberTask || f.key === "status")
          .map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`field-${field.key}`}
                className="block text-xs font-semibold uppercase tracking-wider mb-2"
              >
                {field.label}
              </label>
              {field.type === "members" ? (
                <div className="space-y-2">
                  {app.state.users
                    .filter((u) => u.active)
                    .map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 min-h-11"
                      >
                        <input
                          type="checkbox"
                          checked={(value.memberIds as string[]).includes(u.id)}
                          onChange={(e) =>
                            set(
                              "memberIds",
                              e.target.checked
                                ? [...(value.memberIds as string[]), u.id]
                                : (value.memberIds as string[]).filter(
                                    (id) => id !== u.id,
                                  ),
                            )
                          }
                        />
                        {u.name}
                      </label>
                    ))}
                </div>
              ) : field.type === "steps" ? (
                <StepEditor
                  steps={value.steps as Step[]}
                  onChange={(steps) => set("steps", steps)}
                />
              ) : field.type === "textarea" ? (
                <textarea
                  id={`field-${field.key}`}
                  className="han-input"
                  rows={3}
                  value={String(value[field.key] || "")}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              ) : field.key === "category" && ["income", "expenses", "leads"].includes(table) ? (
                <select id={`field-${field.key}`} className="han-input" value={String(value.category || "General")} onChange={e => set("category", e.target.value)}>
                  {Array.from(new Set(["General", String(value.category || "General"), ...app.state.categories.filter(c => c.kind === (table === "expenses" ? "expense" : table === "leads" ? "lead" : "income")).map(c => String(c.name))])).map(category => <option key={category}>{category}</option>)}
                </select>
              ) : field.options ||
                field.type === "user" ||
                field.type === "project" ? (
                <select
                  id={`field-${field.key}`}
                  className="han-input"
                  value={String(value[field.key] || "")}
                  onChange={(e) => set(field.key, e.target.value)}
                >
                  {field.type === "project" ? (
                    <>
                      <option value="">No project</option>
                      {app.projects
                        .filter((p) => !p.archived)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </>
                  ) : field.type === "user" ? (
                    app.state.users
                      .filter((u) => u.active && (table !== "tasks" || !value.projectId || app.projects.find(p => p.id === value.projectId)?.memberIds?.includes(u.id)))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))
                  ) : (
                    field.options!.map((o) => <option key={o} value={o}>{readable(o)}</option>)
                  )}
                </select>
              ) : (
                <input
                  id={`field-${field.key}`}
                  className="han-input"
                  type={field.type || "text"}
                  required={field.required}
                  maxLength={field.type === "url" ? 2000 : 250}
                  step={field.type === "number" ? "0.01" : undefined}
                  min={field.type === "number" ? 0 : undefined}
                  max={field.key === "progress" ? 100 : undefined}
                  value={String(value[field.key] ?? "")}
                  onChange={(e) =>
                    set(
                      field.key,
                      field.type === "number"
                        ? e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                        : e.target.value,
                    )
                  }
                />
              )}
            </div>
          ))}

        {table === "expenses" && (
          <div className="space-y-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600">
              Founder Expense Allocation
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`filter-chip text-xs ${splitType === "equal" ? "active" : ""}`}
                onClick={() => setSplitType("equal")}
              >
                Equal (All 4)
              </button>
              <button
                type="button"
                className={`filter-chip text-xs ${splitType === "individual" ? "active" : ""}`}
                onClick={() => setSplitType("individual")}
              >
                Individual (100% Payer)
              </button>
              <button
                type="button"
                className={`filter-chip text-xs ${splitType === "custom" ? "active" : ""}`}
                onClick={() => setSplitType("custom")}
              >
                Custom Split
              </button>
            </div>
            {splitType === "custom" && (
              <div className="space-y-2 pt-2 border-t border-neutral-200">
                {activeFounders.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold">{u.name}</span>
                    <div className="flex items-center gap-1">
                      <span>₹</span>
                      <input
                        aria-label={`Allocation for ${u.name}`}
                        type="number"
                        step="0.01"
                        min="0"
                        className="han-input w-28 text-right py-1"
                        value={customAllocations[u.id] ?? ""}
                        onChange={(e) =>
                          setCustomAllocations((prev) => ({
                            ...prev,
                            [u.id]: Number(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
                <div
                  className={`p-2 rounded text-xs flex justify-between font-semibold ${
                    discrepancyCents === 0
                      ? "bg-black text-white"
                      : "bg-neutral-100 text-black border border-neutral-300"
                  }`}
                >
                  <span>Allocated Total: ₹{totalCustom.toFixed(2)}</span>
                  <span>
                    {discrepancyCents === 0
                      ? "✓ Reconciled"
                      : `Discrepancy: ₹${(Math.abs(discrepancyCents) / 100).toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}
            {splitType === "equal" && (
              <p className="text-xs text-neutral-500">
                Total ₹{Number(value.amount || 0).toLocaleString("en-IN")} will be split equally across all active founders with deterministic integer-paise remainder.
              </p>
            )}
            {splitType === "individual" && (
              <p className="text-xs text-neutral-500">
                Entire amount belongs exclusively to the payer. No reimbursement debt is generated.
              </p>
            )}
          </div>
        )}

        <button className="han-btn-primary" disabled={app.busy}>
          {app.busy ? "Saving…" : "Save"}
        </button>
      </form>
    </Modal>
  );
}
type Step = { id: number; title: string; status: string };
function StepEditor({
  steps,
  onChange,
}: {
  steps: Step[];
  onChange: (s: Step[]) => void;
}) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={step.id} className="p-3 border rounded-xl space-y-2">
          <input
            aria-label={`Step ${i + 1} title`}
            className="han-input"
            value={step.title}
            required
            onChange={(e) =>
              onChange(
                steps.map((s) =>
                  s.id === step.id ? { ...s, title: e.target.value } : s,
                ),
              )
            }
          />
          <select
            aria-label={`Step ${i + 1} status`}
            className="han-input"
            value={step.status}
            onChange={(e) =>
              onChange(
                steps.map((s) =>
                  s.id === step.id ? { ...s, status: e.target.value } : s,
                ),
              )
            }
          >
            {["Pending", "In Progress", "Completed"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            className="text-sm min-h-11"
            onClick={() => onChange(steps.filter((s) => s.id !== step.id))}
          >
            Remove step
          </button>
        </div>
      ))}
      <button
        type="button"
        className="han-btn-secondary"
        onClick={() =>
          onChange([
            ...steps,
            {
              id: Math.max(0, ...steps.map((s) => s.id)) + 1,
              title: "",
              status: "Pending",
            },
          ])
        }
      >
        Add step
      </button>
    </div>
  );
}
function Actions({
  table,
  item,
  edit,
  remove,
}: {
  table: string;
  item: RecordData;
  edit: () => void;
  remove: () => void;
}) {
  const app = useApp();
  const isOwner = app.user?.role === "OWNER";
  const allowed =
    table !== "notifications" && !item.salaryPaymentId && (
    isOwner ||
    (table === "projects" && app.can("projects.manage")) ||
    (table === "tasks" && (app.can("tasks.manage") || item.assignedUserId === app.user?.id)) ||
    (table === "expenses" && app.can("finance.manage")) ||
    (table === "income" && app.can("finance.manage")) ||
    (table === "settlements" && app.can("finance.manage")) ||
    (table === "leads" && app.can("leads.manage")) ||
    (table === "funnels" && app.can("funnels.manage")) ||
    (table === "calendar_events" && (app.can("calendar.manage") || item.assignedUserId === app.user?.id)) ||
    (table === "team_members" && app.can("projects.manage")) ||
    (table === "categories" && app.can("projects.manage")));
  if (!allowed) return null;
  const isVoid = table === "expenses" && item.status === "void";

  return (
    <div className="flex items-center gap-2 mt-3 border-t border-neutral-100 pt-2">
      {isVoid ? (
        <span className="text-[11px] font-mono font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-300 line-through">
          Voided {item.voidReason ? `(${String(item.voidReason)})` : ""}
        </span>
      ) : (
        <>
          <button className="action" onClick={edit}>
            <Pencil size={15} />
            Edit
          </button>
          {isOwner || app.can("tasks.manage") || table !== "tasks" ? (
            <button className="action" onClick={remove}>
              <Trash2 size={15} />
              Delete
            </button>
          ) : null}
          {table === "expenses" && (isOwner || app.can("finance.manage")) && (
            <button
              className="action text-neutral-800 hover:text-black font-medium"
              disabled={app.busy}
              onClick={async () => {
                const reason = window.prompt("Reason for voiding this expense:", "Voided by user");
                if (reason) {
                  const res = await app.request(`expenses/${item.id}/void`, "POST", { reason });
                  if (res?.ok) {
                    app.showToast("Expense voided.");
                    await app.refresh();
                  }
                }
              }}
            >
              Void
            </button>
          )}
          {table === "projects" && (
            <button
              className="action"
              disabled={app.busy}
              onClick={() =>
                void app.mutate(`projects/${item.id}`, "PATCH", {
                  archived: !item.archived,
                })
              }
            >
              {item.archived ? <RotateCcw size={15} /> : <Archive size={15} />}{" "}
              {item.archived ? "Restore" : "Archive"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
export function Workspace() {
  const app = useApp();
  const map: Record<string, string> = {
    "project-details": "projects",
    "funnel-details": "funnels",
    money: "expenses",
    "add-expense": "expenses",
    team: "team_members",
    calendar: "calendar_events",
  };
  const table = map[app.currentScreen] || app.currentScreen;

  const [editing, setEditing] = useState<{
      table: string;
      item?: RecordData;
      initialValues?: Record<string, unknown>;
    } | null>(null);

  useEffect(() => {
    if (app.createOnOpen) {
      app.setCreateOnOpen(false);
      if (!["project-details", "funnel-details", "profile", "home"].includes(app.currentScreen)) {
        const timer = setTimeout(() => setEditing({ table }), 0);
        return () => clearTimeout(timer);
      }
    }
  }, [app.createOnOpen, table, app.currentScreen, app]);

  const [deleting, setDeleting] = useState<{
      table: string;
      item: RecordData;
    } | null>(null),
    [filter, setFilter] = useState(app.screenFilter),
    [query, setQuery] = useState(""),
    [moneyType, setMoneyType] = useState("All"),
    [settingsTab, setSettingsTab] = useState("settings");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [taskProject, setTaskProject] = useState("All");
  const [taskSort, setTaskSort] = useState("Due date");
  const [alertEnabled, setAlertEnabled] = useState(() => localStorage.getItem(`han_alerts_${app.user?.id}`) !== "off");

  const isOwner = app.user?.role === "OWNER";
  if (app.currentScreen === "profile")
    return (
      <Page title="You">
        <div className="han-card dark flex items-center justify-between">
          <div>
            <p className="han-tagline">Signed in</p>
            <h1 className="font-serif text-3xl mt-2">{app.user?.name}</h1>
            <p className="text-xs mt-1.5 tracking-widest">{["user-1", "user-2", "user-3", "user-4"].includes(app.user?.id || "") ? "FOUNDER" : app.user?.role}</p>
          </div>
          <div className="w-16 h-16 bg-black p-2 rounded-2xl border border-neutral-700 shadow-xl flex items-center justify-center shrink-0">
            <img src="/logo.png" alt="HAN Media Factory" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="han-card">{app.projects.length} projects</div>
          <div className="han-card">
            {app.tasks.filter((t) => t.completed).length} completed tasks
          </div>
        </div>
        <TeamWorkspaceFeed />
        <button
          className="han-btn-secondary"
          onClick={() => app.navigateTo("team")}
        >
          Team & accounts <ArrowRight size={16} />
        </button>
        <button
          className="han-btn-secondary"
          onClick={() => app.navigateTo("calendar")}
        >
          Calendar <ArrowRight size={16} />
        </button>
        <button
          className="han-btn-secondary"
          onClick={() => window.dispatchEvent(new CustomEvent("han:play-intro"))}
        >
          Watch HAN Entry Film <ArrowRight size={16} />
        </button>
        {(isOwner || app.can("finance.view") || app.can("projects.manage") || app.can("tasks.manage")) && (
          <AuditLogStream logs={app.state.activity_logs as any[]} />
        )}
        {(isOwner || app.can("projects.manage")) && (
          <>
            <button
              className="han-btn-secondary flex items-center justify-center gap-2"
              onClick={async () => {
                try {
                  const res = await fetch(getApiUrl("backup"), { credentials: "include" });
                  if (!res.ok) throw new Error("Export failed");
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `han-backup-${new Date().toISOString().slice(0, 10)}.sqlite`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                  app.showToast("System backup downloaded.");
                } catch {
                  app.showToast("Backup export failed.");
                }
              }}
            >
              <Download size={16} /> Download System Backup
            </button>
            <div className="flex gap-2">
              {["settings", "categories"].map((t) => (
                <button
                  key={t}
                  className={`filter-chip ${settingsTab === t ? "active" : ""}`}
                  onClick={() => setSettingsTab(t)}
                >
                  {titleFor[t]}
                </button>
              ))}
            </div>
            {settingsTab === "settings" && <p className="text-sm text-neutral-600">Workspace reference notes. These name/value records do not change application behavior.</p>}
            <button
              className="han-btn-secondary"
              onClick={() => setEditing({ table: settingsTab })}
            >
              Add {titleFor[settingsTab]}
            </button>
            {app.state[settingsTab as "settings" | "categories"].map((item) => (
              <div key={item.id} className="han-card">
                <p>{String(item.name)}</p>
                <p className="text-sm text-neutral-500">
                  {String(item.value || item.kind)}
                </p>
                <Actions
                  table={settingsTab}
                  item={item}
                  edit={() => setEditing({ table: settingsTab, item })}
                  remove={() => setDeleting({ table: settingsTab, item })}
                />
              </div>
            ))}
          </>
        )}
        <PasswordForm />
        <div className="han-card"><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={alertEnabled} onChange={event => { setAlertEnabled(event.target.checked); localStorage.setItem(`han_alerts_${app.user!.id}`, event.target.checked ? "on" : "off"); if (!event.target.checked) app.dismissNotificationAlert(); }} />Show alerts while HAN is open</label><p className="text-xs text-neutral-500 mt-2">New assignments, completions and payment updates appear as an alert. Background push is configured separately below.</p></div>
        <PushPreferences />
        {app.pendingMutations.length > 0 && <section className="han-card space-y-3" aria-label="Pending changes">
          <h2 className="font-semibold">Pending changes ({app.pendingMutations.length})</h2>
          <p className="text-sm">Queued changes have not been confirmed. Resolve a rejected change before later changes can sync.</p>
          {app.pendingMutations.map(change => <div key={change.id} className="border-t pt-3 text-sm">
            <p>{change.method} · {change.path.split("/")[0]} · {change.timestamp}</p>
            <p role={change.error ? "alert" : undefined}>{change.error || "Waiting to sync"}</p>
            <button className="action" onClick={() => { if (window.confirm("Discard this unsynced change? It has not been saved on the server.")) app.discardPendingMutation(change.id); }}>Discard queued change</button>
          </div>)}
          <button className="han-btn-secondary" disabled={app.syncing} onClick={() => void app.restore()}>Retry sync</button>
        </section>}
        <button
          className="han-btn-primary"
          disabled={app.busy}
          onClick={() => void app.logout()}
        >
          Sign out / switch identity
        </button>
        {editing && <Editor {...editing} onClose={() => setEditing(null)} />}
        <DeleteSheet target={deleting} onClose={() => setDeleting(null)} />
      </Page>
    );
  const detail = app.currentScreen.endsWith("details");
  let list: RecordData[] =
    table === "expenses"
      ? (app.expenses as unknown as RecordData[])
      : ((app.state[table as keyof State] || []) as unknown as RecordData[]);
  if (detail)
    list = list.filter(
      (item) =>
        item.id ===
        (table === "projects" ? app.activeProjectId : app.activeFunnelId),
    );
  const write = table !== "notifications" && (
    isOwner ||
    (table === "projects" && app.can("projects.manage")) ||
    (table === "tasks" && app.can("tasks.manage")) ||
    (table === "expenses" && app.can("finance.manage")) ||
    (table === "income" && app.can("finance.manage")) ||
    (table === "settlements" && app.can("finance.manage")) ||
    (table === "leads" && app.can("leads.manage")) ||
    (table === "funnels" && app.can("funnels.manage")) ||
    (table === "calendar_events" && app.can("calendar.manage")));

  if (table === "funnels" && !write)
    return (
      <Page title="Growth">
        <div className="han-card">
          Your account has no growth access. Ask the owner to update your
          permissions.
        </div>
      </Page>
    );
  const visible = list.filter((item) => {
    if (
      query &&
      !String(item.title || item.name)
        .toLowerCase()
        .includes(query.toLowerCase())
    )
      return false;
    if (table === "projects" && !detail) {
      if (filter === "Overdue") return !item.archived && item.category !== "Completed" && !!item.deadline && String(item.deadline) < today();
      if (filter === "Archived") return !!item.archived;
      if (item.archived) return false;
      if (filter !== "All") return item.category === filter;
    }
    if (table === "tasks") {
      if (app.activeProjectId && item.projectId !== app.activeProjectId) return false;
      if (assigneeFilter !== "All" && item.assignedUserId !== assigneeFilter) return false;
      if (taskProject !== "All" && (taskProject === "Unassigned" ? !!item.projectId : item.projectId !== taskProject)) return false;
      if (filter === "In Progress") return item.status === "IN_PROGRESS";
      if (filter === "Cancelled") return item.status === "CANCELLED";
      if (filter === "Overdue") return String(item.date) < today() && !["COMPLETED", "CANCELLED"].includes(String(item.status));
      if (filter === "Today") return item.date === today();
      if (filter === "Upcoming")
        return String(item.date) > today() && !item.completed;
      if (filter === "Completed") return !!item.completed;
    }
    if (table === "expenses" && moneyType !== "All")
      return item.type === moneyType;
    if (table === "notifications" && filter === "Unread") return !item.read;
    if (table === "calendar_events") return item.date === app.selectedDate;
    return true;
  }).sort((a, b) => table === "tasks" ? (taskSort === "Priority" ? ["HIGH", "MEDIUM", "LOW"].indexOf(String(a.priority)) - ["HIGH", "MEDIUM", "LOW"].indexOf(String(b.priority)) : String(a.date).localeCompare(String(b.date))) : 0);
  return (
    <Page
      title={
        detail
          ? String(list[0]?.name || list[0]?.title || "Details")
          : titleFor[table] || "HAN"
      }
      onAdd={
        write && !detail && table !== "expenses"
          ? () =>
              setEditing({
                table:
                  table === "expenses" && moneyType === "income"
                    ? "income"
                    : table,
              })
          : undefined
      }
    >
      {!detail &&
        ["projects", "tasks", "leads", "funnels", "team_members"].includes(
          table,
        ) && (
          <SearchBar
            value={query}
            onChange={setQuery}
            placeholder={`Search ${titleFor[table] || "items"}…`}
          />
        )}
      {table === "leads" && (
        <KanbanPipeline
          leads={visible as any[]}
          canManage={write}
          onRemove={lead => setDeleting({ table: "leads", item: lead as unknown as RecordData })}
          onEdit={(lead) => setEditing({ table: "leads", item: lead as unknown as RecordData })}
          onStatusChange={(leadId, status) =>
            void app.mutate(`leads/${leadId}`, "PATCH", { status })
          }
        />
      )}
      {table === "expenses" && (
        <>
          <MoneyOverview onAdd={(tbl, initialValues) => setEditing({ table: tbl, initialValues })} onEdit={item => setEditing({ table: "salary_payments", item })} onDelete={item => setDeleting({ table: "salary_payments", item })} />
          <h2 className="font-serif text-2xl">Transactions</h2>
          <SearchBar value={query} onChange={setQuery} placeholder="Search transactions…" />
          <div className="flex gap-2">
            {["All", "income", "expense"].map((t) => (
              <button
                key={t}
                className={`filter-chip ${moneyType === t ? "active" : ""}`}
                onClick={() => setMoneyType(t)}
              >
                {t === "All" ? "All" : t === "income" ? "Income" : "Expenses"}
              </button>
            ))}
          </div>
          <button
            className="han-btn-secondary"
            onClick={() => exportTransactions(app.expenses)}
          >
            Export transactions
          </button>
        </>
      )}
      {table === "projects" && !detail && (
        <>
          <div className="flex gap-2 flex-wrap">
            {["All", "Active", "Overdue", "Completed", "Archived"].map((t) => (
              <button
                key={t}
                className={`filter-chip ${filter === t ? "active" : ""}`}
                onClick={() => setFilter(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            className="han-btn-secondary"
            onClick={() => app.navigateTo("tasks")}
          >
            View tasks <ArrowRight size={16} />
          </button>
        </>
      )}
      {table === "tasks" && (
        <section className="space-y-3" aria-label="Task filters">
        {app.activeProjectId && <div className="han-card text-sm">Tasks for {app.projects.find(p => p.id === app.activeProjectId)?.name}<button className="block underline mt-2" onClick={() => app.selectProject(app.activeProjectId!)}>Back to project</button></div>}
        <div className="flex gap-2 flex-wrap">
          {["All", "Today", "Overdue", "Upcoming", "In Progress", "Completed", "Cancelled"].map((t) => (
            <button
              key={t}
              className={`filter-chip ${filter === t ? "active" : ""}`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(isOwner || app.can("tasks.manage")) && <label className="text-xs">Assigned to<select aria-label="Assigned to" className="han-input mt-1" value={assigneeFilter} onChange={event => setAssigneeFilter(event.target.value)}><option value="All">Everyone</option>{app.state.users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>}
          {!app.activeProjectId && <label className="text-xs">Project filter<select className="han-input mt-1" value={taskProject} onChange={event => setTaskProject(event.target.value)}><option value="All">All projects</option><option value="Unassigned">No project</option>{app.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
          <label className="text-xs">Sort tasks<select className="han-input mt-1" value={taskSort} onChange={event => setTaskSort(event.target.value)}>{["Due date", "Priority"].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <p className="text-xs text-neutral-500">{visible.length} shown · {app.tasks.filter(task => !["COMPLETED", "CANCELLED"].includes(task.status || "TODO")).length} open · {app.tasks.filter(task => task.completed).length} completed</p>
        </section>
      )}
      {table === "funnels" && write && (
        <button
          className="han-btn-secondary"
          onClick={() => app.navigateTo("leads")}
        >
          Manage leads <ArrowRight size={16} />
        </button>
      )}
      {table === "calendar_events" && (
        <>
          <label htmlFor="calendar-date" className="text-sm font-semibold">
            Selected date
          </label>
          <input
            id="calendar-date"
            type="date"
            className="han-input"
            value={app.selectedDate}
            onChange={(e) => app.setSelectedDate(e.target.value)}
          />
          {app.tasks
            .filter((t) => t.date === app.selectedDate)
            .map((t) => (
              <div className="han-card" key={t.id}>
                <p className="font-semibold">{t.title}</p>
                <p className="text-xs text-neutral-500 mt-2">
                  Task · {readable(t.status || "TODO")}
                </p>
                {(isOwner || app.can("tasks.manage") || t.assignedUserId === app.user?.id) && t.status !== "CANCELLED" && <button disabled={app.busy} className="action underline" onClick={() => app.toggleTask(t.id)}>{t.completed ? "Reopen task" : "Complete task"}</button>}
              </div>
            ))}
          {app.tasks.filter((t) => t.date === app.selectedDate).length === 0 && visible.length === 0 && (
            <div className="p-6 text-center text-xs text-neutral-500 bg-white border rounded-2xl">
              No tasks or events scheduled for {app.selectedDate}.
            </div>
          )}
        </>
      )}
      {table === "notifications" && app.unreadNotificationCount > 0 && (
        <button
          className="han-btn-secondary"
          onClick={app.markAllNotificationsRead}
        >
          Mark all as read ({app.unreadNotificationCount})
        </button>
      )}
      {table === "notifications" && <div className="flex gap-2">{["All", "Unread"].map(value => <button key={value} className={`filter-chip ${filter === value ? "active" : ""}`} onClick={() => setFilter(value)}>{value === "Unread" ? `Unread (${app.unreadNotificationCount})` : "All"}</button>)}</div>}
      {table === "team_members" && <AccountManagement />}
      {visible.length === 0 && table !== "leads" && table !== "calendar_events" && (
        <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl space-y-3">
          <p className="text-sm font-semibold text-neutral-800">
            {query
              ? `No ${titleFor[table] || "records"} matching "${query}"`
              : table === "notifications" ? "You're all caught up" : `No ${titleFor[table] || "items"} found`}
          </p>
          <p className="text-xs text-neutral-500">
            {table === "notifications" ? "Task assignments and workspace updates will appear here." : write
              ? `Click the "+" button above to add a new ${singularTitleFor[table] || "record"}.`
              : "No data available."}
          </p>
        </div>
      )}
      {(table === "leads" ? [] : visible).map((item) => {
        const actualTable =
          table === "expenses"
            ? item.type === "income"
              ? "income"
              : "expenses"
            : table;
        return (
          <div key={item.id} className="space-y-1">
            {table === "projects" && !detail ? (
              <ProjectCard
                project={app.projects.find((p) => p.id === item.id)!}
                onClick={() => app.selectProject(item.id)}
              />
            ) : table === "funnels" && !detail ? (
              <FunnelCard
                funnel={app.funnels.find((f) => f.id === item.id)!}
                onClick={() => app.selectFunnel(item.id)}
              />
            ) : (
              <div
                className={`han-card ${table === "notifications" && !item.read ? "border-black" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">
                    {String(item.title || item.name)}
                  </h3>
                  {table === "tasks" &&
                    (isOwner || app.can('tasks.manage') || item.assignedUserId === app.user?.id) && (
                      <button
                        aria-label={
                          item.completed ? "Mark pending" : "Mark complete"
                        }
                        className={`check-button ${item.completed ? "selected" : ""}`}
                        disabled={app.busy}
                        onClick={() => app.toggleTask(item.id)}
                      >
                        {item.completed ? <Check size={18} /> : null}
                      </button>
                    )}
                  {table === "expenses" && (
                    <b className="whitespace-nowrap">
                      {item.type === "expense" ? "−" : "+"}₹
                      {Number(item.amount).toLocaleString("en-IN")}
                    </b>
                  )}
                </div>
                {["subtitle", "description", "notes", "nextAction"].map(
                  (key) =>
                    item[key] ? (
                      <p
                        key={key}
                        className="text-sm text-neutral-600 mt-2 whitespace-pre-wrap"
                      >
                        {String(item[key])}
                      </p>
                    ) : null,
                )}
                {item.date ? (
                  <p className="text-xs text-neutral-500 mt-3">
                    {dateLabel(String(item.date))}
                  </p>
                ) : null}
                {table === "notifications" && <p className="text-xs text-neutral-500 mt-2">{item.category as string} · {new Date(String(item.timestamp)).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {item.read ? "Read" : "Unread"}</p>}
                {item.status ? (
                  <p className="text-xs uppercase tracking-wide mt-2">
                    {readable(String(item.status))}
                  </p>
                ) : null}
                {table === "tasks" && <div className="flex items-center gap-2 mt-3 text-xs"><span>Priority: {readable(String(item.priority))}</span>{(isOwner || app.can('tasks.manage') || item.assignedUserId === app.user?.id) && <select className="han-input" aria-label={`Status for ${item.title}`} disabled={app.busy} value={String(item.status)} onChange={event => void app.mutate(`tasks/${item.id}`, "PATCH", { status: event.target.value })}>{["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETED", "CANCELLED"].map(status => <option key={status} value={status}>{readable(status)}</option>)}</select>}</div>}
                {item.assignedUserId ? (
                  <p className="text-xs mt-2">
                    Assigned to{" "}
                    {
                      app.state.users.find((u) => u.id === item.assignedUserId)
                        ?.name
                    }
                  </p>
                ) : null}
                {table === "team_members" && (
                  <div className="space-y-2 mt-2 text-sm">
                    <p className="text-neutral-700">
                      Role: <span className="font-semibold">{String(item.role)}</span>
                      {item.sharePercentage ? ` · Share: ${item.sharePercentage}` : ""}
                    </p>
                    <p className="text-xs text-neutral-900 font-semibold bg-neutral-100 border border-neutral-300 px-2.5 py-1 rounded-lg inline-block">
                      Assigned Monthly Salary: {item.salary ? `₹${Number(item.salary).toLocaleString("en-IN")}` : "Not assigned"}
                    </p>
                    {(isOwner || app.can("finance.manage")) && (
                      <div className="pt-1">
                        <button
                          className="action text-xs font-semibold text-black hover:underline flex items-center gap-1.5"
                          onClick={() => setEditing({ table: "salary_payments", initialValues: { name: String(item.name), amount: item.salary || "", date: today() } })}
                        >
                          <Wallet size={14} /> Allot / Record Salary Payment
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {table === "notifications" && (
                  <>
                    {item.targetScreen && <button className="action" onClick={() => app.navigateTo(item.targetScreen as Parameters<typeof app.navigateTo>[0])}>View update</button>}
                    <p className="text-xs text-neutral-500 mt-3">
                      {new Date(String(item.timestamp)).toLocaleString("en-IN")}
                    </p>
                    {!item.read && (
                      <button
                        className="action"
                        onClick={() =>
                          void app.mutate(`notifications/${item.id}`, "PATCH", {
                            read: true,
                          })
                        }
                      >
                        Mark read
                      </button>
                    )}
                  </>
                )}
                {table === "projects" && detail && (
                  <>
                    <div className="mt-4">
                      <ProgressBar progress={Number(item.progress)} />
                      <p className="text-xs mt-2">
                        {item.progress as number}% · {item.progressSource === "tasks" ? "Calculated from non-cancelled tasks" : "Manual estimate"} · {item.deadline ? `Deadline ${dateLabel(String(item.deadline))}` : "No deadline set"}
                      </p>
                    </div>
                    <p className="text-sm mt-3">
                      Team: {(item.teamMembers as string[]).join(", ")}
                    </p>
                    {["repoUrl", "previewUrl", "docsUrl"]
                      .filter((k) => item[k])
                      .map((k) => (
                        <a
                          className="action underline"
                          key={k}
                          href={String(item[k])}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {k === "repoUrl"
                            ? "Repository"
                            : k === "previewUrl"
                              ? "Open project"
                              : "Documentation"}{" "}
                          <ArrowRight size={14} />
                        </a>
                      ))}
                    <button
                      className="han-btn-secondary mt-4"
                      onClick={() => app.navigateTo("tasks")}
                    >
                      Manage tasks
                    </button>
                    {app.tasks
                      .filter((t) => t.projectId === item.id)
                      .map((t) => (
                        <div key={t.id} className="text-sm mt-3 flex items-center justify-between gap-2">
                          <span>{t.title} · {readable(t.status || "TODO")}</span>{(isOwner || app.can("tasks.manage") || t.assignedUserId === app.user?.id) && t.status !== "CANCELLED" && <button className="action underline" disabled={app.busy} onClick={() => app.toggleTask(t.id)}>{t.completed ? "Reopen" : "Complete"}</button>}
                        </div>
                      ))}
                  </>
                )}
                {table === "funnels" && detail && (
                  <div className="mt-4 space-y-3">
                    {(item.steps as Step[]).map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center justify-between gap-3 border-t pt-3"
                      >
                        <p className="text-sm">{step.title}</p>
                        <button
                          className="action"
                          disabled={app.busy}
                          onClick={() =>
                            void app.mutate(`funnels/${item.id}`, "PATCH", {
                              steps: (item.steps as Step[]).map((s) =>
                                s.id === step.id
                                  ? {
                                      ...s,
                                      status:
                                        step.status === "Completed"
                                          ? "Pending"
                                          : step.status === "Pending"
                                            ? "In Progress"
                                            : "Completed",
                                    }
                                  : s,
                              ),
                            })
                          }
                        >
                          {step.status}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <Actions
              table={actualTable}
              item={item}
              edit={() => setEditing({ table: actualTable, item })}
              remove={() => setDeleting({ table: actualTable, item })}
            />
          </div>
        );
      })}
      {editing && (
        <Editor
          key={`${editing.table}-${editing.item?.id}`}
          {...editing}
          onClose={() => setEditing(null)}
        />
      )}
      <DeleteSheet target={deleting} onClose={() => setDeleting(null)} />
    </Page>
  );
}
function DeleteSheet({
  target,
  onClose,
}: {
  target: { table: string; item: RecordData } | null;
  onClose: () => void;
}) {
  const app = useApp();
  return (
    <Modal isOpen={!!target} onClose={onClose} title="Delete record?">
      <p className="text-sm mb-5">
        Delete “
        {String(target?.item.title || target?.item.name || "this record")}”?{" "}
        {target?.table === "projects"
          ? "Linked tasks will also be deleted."
          : ""}{" "}
        This cannot be undone.
      </p>
      <button
        className="han-btn-primary"
        disabled={app.busy}
        onClick={async () => {
          if (
            target &&
            (await app.mutate(`${target.table}/${target.item.id}`, "DELETE"))
          )
            onClose();
        }}
      >
        Delete
      </button>
      <button className="han-btn-secondary mt-3" onClick={onClose}>
        Cancel
      </button>
    </Modal>
  );
}
function Page({
  title,
  children,
  onAdd,
}: {
  title: string;
  children: ReactNode;
  onAdd?: () => void;
}) {
  const app = useApp();
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader
        title={title}
        onBack={() => app.navigateTo("home")}
        showPlus={!!onAdd}
        onPlusClick={onAdd}
      />
      <main className="flex-1 min-h-0 overflow-y-auto p-5 pt-2 space-y-4">
        {children}
      </main>
      <BottomNavigation activeTab={app.activeTab} onSelectTab={app.switchTab} />
    </div>
  );
}
function AccountManagement() {
  const app = useApp();
  const [editing, setEditing] = useState<Account | null>(null),
    [name, setName] = useState(""),
    [permissions, setPermissions] = useState<string[]>([]),
    [active, setActive] = useState(true),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  return (
    <>
      <h2 className="font-serif text-2xl">Application accounts</h2>
      <p className="text-sm text-neutral-600">Accounts control sign-in and permissions. Team profiles below are descriptive records and do not grant access.</p>
      {(app.user?.role === "OWNER" || app.can("projects.manage")) && <button className="han-btn-secondary" onClick={() => { setEditing({ id: "", name: "", role: "MEMBER", active: true, permissions: [] }); setName(""); setPermissions([]); setActive(true); setPassword(""); }}>Add member account</button>}
      {app.state.users.map((u) => (
        <div
          className={`han-card ${u.id === app.user?.id ? "dark" : ""}`}
          key={u.id}
        >
          <div className="flex justify-between">
            <b>{u.name}</b>
            <span className="text-xs">{u.role}</span>
          </div>
          <p className="text-xs mt-2">
            {u.id === app.user?.id
              ? "Active identity"
              : u.active
                ? "Account enabled"
                : "Account disabled"}
          </p>
          {(app.user?.role === "OWNER" || app.can("projects.manage")) && (
            <button
              className="action"
              onClick={() => {
                setEditing(u);
                setName(u.name);
                setPermissions(u.permissions);
                setActive(u.active);
                setPassword("");
              }}
            >
              Manage account
            </button>
          )}
        </div>
      ))}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title="Manage account"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await app.mutate(editing!.id ? `users/${editing!.id}` : "users", editing!.id ? "PATCH" : "POST", {
              name,
              permissions,
              active,
              role: editing!.role,
              ...(password ? { password } : {}),
            });
            if (ok) setEditing(null);
          }}
        >
          <label className="block">
            Name
            <input
              className="han-input mt-2"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <p className="text-sm">
            Role: {editing?.role}. The owner account is protected.
          </p>
          {editing?.role !== "OWNER" && (
            <>
              <label className="flex gap-3 min-h-11 items-center">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Account enabled
              </label>
              {app.state.permissionIds.map((p) => (
                <label key={p} className="flex gap-3 min-h-11 items-center">
                  <input
                    type="checkbox"
                    checked={permissions.includes(p)}
                    onChange={(e) =>
                      setPermissions(
                        e.target.checked
                          ? [...permissions, p]
                          : permissions.filter((v) => v !== p),
                      )
                    }
                  />
                  {
                    (
                      {
                        "finance.view": "View finances",
                        "finance.manage": "Manage finances & expenses",
                        "projects.manage": "Manage projects",
                        "tasks.manage": "Manage team tasks",
                        "leads.manage": "Manage leads",
                        "funnels.manage": "Manage funnels",
                        "calendar.manage": "Manage own calendar",
                      } as Record<string, string>
                    )[p] || p
                  }
                </label>
              ))}
            </>
          )}
          <label className="block">
            New password (optional)
            <div className="relative flex items-center mt-2">
              <input
                type={showPassword ? "text" : "password"}
                required={!editing?.id}
                className="han-input w-full pr-12"
                autoComplete="new-password"
                minLength={12}
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 p-2 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <p className="text-xs text-neutral-500">
            Changing an account signs it out on all devices. Disable departed members and create a separate account for replacements to preserve attribution.
          </p>
          <button className="han-btn-primary" disabled={app.busy}>
            Save account
          </button>
        </form>
      </Modal>
    </>
  );
}
function PasswordForm() {
  const app = useApp();
  const [open, setOpen] = useState(false),
    [currentPassword, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [showCurrent, setShowCurrent] = useState(false),
    [showNew, setShowNew] = useState(false);
  return (
    <>
      <button className="han-btn-secondary" onClick={() => setOpen(true)}>
        Change password
      </button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Change password"
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await app.request("password", "POST", {
                currentPassword,
                password,
              });
              setOpen(false);
              await app.restore();
              app.showToast("Password changed. Sign in again.");
            } catch (error) {
              app.showToast((error as Error).message);
            }
          }}
        >
          <label className="block">
            Current password
            <div className="relative flex items-center mt-2">
              <input
                className="han-input w-full pr-12"
                type={showCurrent ? "text" : "password"}
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(e) => setCurrent(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                aria-label={showCurrent ? "Hide password" : "Show password"}
                className="absolute right-3 p-2 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <label className="block">
            New password
            <div className="relative flex items-center mt-2">
              <input
                className="han-input w-full pr-12"
                type={showNew ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={200}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? "Hide password" : "Show password"}
                className="absolute right-3 p-2 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button className="han-btn-primary">Update password</button>
        </form>
      </Modal>
    </>
  );
}
function exportTransactions(items: ReturnType<typeof useApp>["expenses"]) {
  const cell = (v: unknown) =>
    `"${String(v ?? "")
      .replace(/^[=+@\-\t\r]/, "'")
      .replaceAll('"', '""')}"`;
  const data = [
    ["Date", "Title", "Type", "Category", "Subcategory", "Amount INR", "Paid By", "Status", "Receipt", "Notes"],
    ...items.map((i) => [
      i.date,
      i.title,
      i.type,
      i.category,
      i.subcategory || "",
      i.amount,
      i.paidBy || "",
      i.status || "active",
      i.receipt || "",
      i.notes || "",
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([data], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `han-transactions-${today()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
