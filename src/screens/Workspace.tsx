import { useState, useEffect } from "react";
import type { FormEvent, ReactNode } from "react";
import { useApp } from "../context/AppContext";
import { today, dateLabel } from "../context/dates";
import { getApiUrl } from "../utils/apiConfig";
import { formatTaskAudit } from "../utils/display";
import { getTheme, setTheme as saveTheme, type Theme } from "../utils/theme";
import type { RecordData, Account, State } from "../context/AppContext";
import { ScreenHeader } from "../components/ui/ScreenHeader";
import { BottomNavigation } from "../components/ui/BottomNavigation";
import { Modal } from "../components/ui/Modal";
import { ProjectCard } from "../components/ui/ProjectCard";
import { FunnelCard } from "../components/ui/FunnelCard";
import { MoneyOverview } from "../components/ui/MoneyOverview";
import { SearchBar } from "../components/ui/SearchBar";
import { KanbanPipeline } from "../components/ui/KanbanPipeline";
import { AuditLogStream } from "../components/ui/AuditLogStream";
import { TeamWorkspaceFeed } from "../components/ui/TeamWorkspaceFeed";
import { PushPreferences } from "../components/ui/PushPreferences";
import { WorkspaceTargetsWidget } from "../components/ui/WorkspaceTargetsWidget";
import { ExpandableFAQ } from "../components/ui/ExpandableFAQ";
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
  Settings,
  Bell,
  Lock,
  LogOut,
  ChevronRight,
  Plus,
  Building,
  FileText,
  MoreVertical,
  Circle,
  CheckCircle2,
  Filter,
  Users,
  Monitor,
  Moon,
  Sun,
  Phone,
  Calendar,
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
    { key: "progress", label: "Progress (%)", type: "number" },
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
    { key: "paymentMethod", label: "Payment method", options: ["UPI", "Bank Transfer", "Credit Card", "Debit Card", "Cash"] },
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
  clients: [
    { key: "name", label: "Client name", required: true },
    { key: "tagline", label: "Tagline / Business info" },
    { key: "contact_person", label: "Primary contact", required: true },
    { key: "contact_role", label: "Contact role" },
    { key: "phone", label: "Phone number", type: "tel", required: true },
    { key: "email", label: "Email address", type: "email", required: true },
    { key: "stage", label: "Lifecycle stage", options: ["Discovery", "Proposal", "Active", "On Hold", "Completed"] },
    { key: "service", label: "Retainer / Service package", required: true },
    { key: "account_health", label: "Account health", options: ["Healthy", "Strong", "Good", "At Risk"] },
    { key: "contract_value", label: "Contract value (₹)" },
    { key: "next_milestone", label: "Next key milestone" },
    { key: "milestone_date", label: "Milestone date", type: "date" },
    { key: "notes", label: "Account notes & relationship history", type: "textarea" },
  ],
  client_followups: [
    { key: "company", label: "Client / Company name", required: true },
    { key: "person", label: "Person to contact", required: true },
    { key: "purpose", label: "Follow-up purpose & agenda", type: "textarea", required: true },
    { key: "due_date", label: "Target due date", type: "date", required: true },
    { key: "time_str", label: "Target time slot (e.g. 11:30 AM)", required: true },
    { key: "status", label: "Follow-up status", options: ["Scheduled", "Due Today", "Overdue", "Completed"] },
  ],
  client_calls: [
    { key: "business", label: "Business name", required: true },
    { key: "contact", label: "Contact person", required: true },
    { key: "phone", label: "Phone number", type: "tel", required: true },
    { key: "type", label: "Call type", options: ["Inbound", "Outbound"] },
    { key: "outcome", label: "Call outcome", required: true },
    { key: "call_time", label: "Time of call" },
    { key: "notes", label: "Discussion notes & next steps", type: "textarea" },
  ],
  client_emails: [
    { key: "party", label: "Recipient / Sender email", type: "email", required: true },
    { key: "subject", label: "Email subject line", required: true },
    { key: "category", label: "Category (e.g. Proposal, Invoice, Update)", required: true },
    { key: "status", label: "Delivery status", options: ["QUEUED", "ACCEPTED", "DELIVERED", "FAILED"] },
    { key: "email_time", label: "Email timestamp" },
    { key: "body", label: "Email message body", type: "textarea" },
  ],
  inquiries: [
    { key: "brand", label: "Company / Brand name", required: true },
    { key: "name", label: "Contact person", required: true },
    { key: "email", label: "Email address", type: "email", required: true },
    { key: "phone", label: "Phone number", type: "tel" },
    { key: "budget_band", label: "Budget band" },
    { key: "status", label: "Inquiry status", options: ["NEW", "IN_REVIEW", "SCOPING", "PROPOSAL_SENT", "WON", "ARCHIVED"] },
    { key: "priority", label: "Priority", options: ["LOW", "NORMAL", "HIGH", "URGENT"] },
    { key: "message", label: "Client brief / message", type: "textarea", required: true },
    { key: "internal_notes", label: "Internal evaluation notes", type: "textarea" },
  ],
};
fields.income = fields.expenses;
const titleFor: Record<string, string> = {
  projects: "Projects",
  tasks: "Tasks",
  expenses: "Money",
  income: "Income",
  leads: "Leads",
  clients: "Clients",
  client_followups: "Follow-ups",
  client_calls: "Calls",
  client_emails: "Emails",
  inquiries: "Inquiries",
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
  clients: "Client",
  client_followups: "Follow-up",
  client_calls: "Call Record",
  client_emails: "Email Log",
  inquiries: "Inbound Inquiry",
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
    status: table === "leads" ? "New" : table === "client_followups" ? "Scheduled" : table === "inquiries" ? "NEW" : "TODO",
    stage: "Discovery",
    account_health: "Healthy",
    service: "Production Retainer",
    contact_person: "",
    contact_role: "Point of Contact",
    company: "",
    person: "",
    purpose: "",
    due_date: today(),
    time_str: "11:00 AM",
    business: "",
    contact: "",
    type: "Outbound",
    outcome: "Connected",
    call_time: "Just now",
    party: "",
    subject: "",
    brand: "",
    message: "",
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
  const duplicateExpense = table === "expenses" && !item && app.expenses.find(expense =>
    expense.type === "expense" && expense.status !== "void" &&
    expense.date === value.date &&
    Number(expense.amount) === Number(value.amount) &&
    String(expense.paidBy || "") === String(value.paidBy || app.user?.id || "") &&
    String(expense.title || "").trim().toLocaleLowerCase() === String(value.title || "").trim().toLocaleLowerCase() &&
    String(expense.vendor || "").trim().toLocaleLowerCase() === String(value.vendor || "").trim().toLocaleLowerCase(),
  );
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
      if (duplicateExpense && !value.confirmDuplicate) {
        setError(`A matching ${duplicateExpense.title} expense for ₹${Number(duplicateExpense.amount).toFixed(2)} is already recorded on this date. Confirm below only if this is a separate charge.`);
        return;
      }
      if (value.category === "__custom__" && !String(value.customCategory || "").trim()) {
        setError("Add a category name or choose one from the list.");
        return;
      }
      if (value.paymentMethod === "__custom__" && !String(value.customPaymentMethod || "").trim()) {
        setError("Add a payment method name or choose one from the list.");
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
      if (value.paymentMethod === "__custom__" && !String(value.customPaymentMethod || "").trim()) {
        setError("Add a payment method name or choose one from the list.");
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
    if (["expenses", "income", "leads"].includes(table) && data.category === "__custom__") {
      data.category = String(value.customCategory || "").trim();
    }
    if (["expenses", "settlements"].includes(table) && data.paymentMethod === "__custom__") {
      data.paymentMethod = String(value.customPaymentMethod || "").trim();
    }
    if (table === "tasks") {
      if (!data.projectId) delete data.projectId;
      if (data.progress !== undefined) data.progress = Math.min(100, Math.max(0, Math.round(Number(data.progress) || 0)));
      if (data.progress === 100 && data.status !== "CANCELLED") data.status = "COMPLETED";
      else if (data.status === "COMPLETED") data.progress = 100;
    }
    if (table === "projects") data.archived = value.archived;
    if (table === "notifications") {
      data.read = value.read;
      data.timestamp = value.timestamp;
    }
    if (table === "expenses") {
      data.paidBy = value.paidBy || app.user?.id;
      data.confirmDuplicate = Boolean(value.confirmDuplicate);
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
        {["expenses", "savings_entries", "salary_payments"].includes(table) && <p className="text-sm text-text-secondary">Available funds: ₹{app.totalFunds.toLocaleString("en-IN")}. Protected savings cannot be spent.</p>}
        {table === "expenses" && duplicateExpense && (
          <label className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-text-primary">
            <input
              type="checkbox"
              checked={Boolean(value.confirmDuplicate)}
              onChange={event => set("confirmDuplicate", event.target.checked)}
              className="mt-1"
            />
            <span><b>Possible duplicate.</b> A matching entry already exists. I confirm this is a separate charge.</span>
          </label>
        )}
        {table === "salary_payments" && <p className="text-sm text-text-secondary">Record a salary you have paid. It deducts funds and appears once in expenses. HAN does not send money to a bank account.</p>}
        {table === "savings_entries" && <label className="flex items-start gap-3 text-sm"><input type="checkbox" required className="mt-1" />I understand this moves funds into protected savings and cannot be withdrawn or deleted in HAN.</label>}
        {table === "projects" && <p className="text-sm text-text-secondary">Progress is calculated from completed, non-cancelled tasks. Without tasks, it uses your estimate. Leave the deadline blank if it is not yet agreed.</p>}
        {table === "tasks" && item && (() => {
          const audit = formatTaskAudit(item as any);
          if (!audit) return null;
          return (
            <div className="p-2.5 rounded-xl bg-surface-elevated border border-border-subtle/80 flex items-center justify-between text-xs">
              <span className="text-text-secondary flex items-center gap-1.5 font-medium">
                <span className={`w-2 h-2 rounded-full ${item.completed ? 'bg-emerald-500' : Number(item.progress) > 0 ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                {audit.text}
              </span>
              {audit.time && <span className="font-mono text-[11px] text-text-muted">{audit.time}</span>}
            </div>
          );
        })()}
        {fields[table]
          .filter((f) => !memberTask || f.key === "status" || f.key === "progress")
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
                <>
                  <select id={`field-${field.key}`} className="han-input han-select" value={String(value.category || "General")} onChange={e => set("category", e.target.value)}>
                    {Array.from(new Set(["General", String(value.category || "General"), ...app.state.categories.filter(c => c.kind === (table === "expenses" ? "expense" : table === "leads" ? "lead" : "income")).map(c => String(c.name))])).map(category => <option key={category}>{category}</option>)}
                    <option value="__custom__">+ Add a custom category…</option>
                  </select>
                  {value.category === "__custom__" && <input aria-label="Custom category" className="han-input mt-2" placeholder="e.g. Travel, Office supplies" maxLength={100} value={String(value.customCategory || "")} onChange={event => set("customCategory", event.target.value)} />}
                </>
              ) : field.key === "paymentMethod" && ["expenses", "settlements"].includes(table) ? (
                <>
                  <select id={`field-${field.key}`} className="han-input han-select" value={String(value.paymentMethod || "UPI")} onChange={event => set("paymentMethod", event.target.value)}>
                    {(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}
                    <option value="__custom__">+ Add a custom payment method…</option>
                  </select>
                  {value.paymentMethod === "__custom__" && <input aria-label="Custom payment method" className="han-input mt-2" placeholder="e.g. Wallet, cheque" maxLength={100} value={String(value.customPaymentMethod || "")} onChange={event => set("customPaymentMethod", event.target.value)} />}
                </>
              ) : field.options ||
                field.type === "user" ||
                field.type === "project" ? (
                <select
                  id={`field-${field.key}`}
                  className="han-input han-select"
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
          <div className="space-y-3 p-3 bg-surface rounded-xl border border-border-subtle">
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">
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
              <div className="space-y-2 pt-2 border-t border-border-subtle">
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
                      ? "bg-page text-text-primary"
                      : "bg-surface-elevated text-text-primary border border-neutral-300"
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
              <p className="text-xs text-text-muted">
                Total ₹{Number(value.amount || 0).toLocaleString("en-IN")} will be split equally across all active founders with deterministic integer-paise remainder.
              </p>
            )}
            {splitType === "individual" && (
              <p className="text-xs text-text-muted">
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
        <span className="text-[11px] font-mono font-bold text-text-muted bg-surface-elevated px-2 py-0.5 rounded border border-neutral-300 line-through">
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
              className="action text-text-primary hover:text-text-primary font-medium"
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
    } | null>(() => app.createOnOpen && !["project-details", "funnel-details", "profile", "home"].includes(app.currentScreen) ? { table } : null);

  useEffect(() => {
    if (app.createOnOpen) {
      app.setCreateOnOpen(false);
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
  const [projectSubTab, setProjectSubTab] = useState<"Tasks" | "Files" | "Notes" | "Activity">("Tasks");
  const [growthTab, setGrowthTab] = useState<"Overview" | "Leads" | "Clients" | "Follow-ups" | "Calls" | "Inquiries" | "Analytics">("Overview");

  const isOwner = app.user?.role === "OWNER";
  const [profileSection, setProfileSection] = useState<string | null>(null);
  const [theme, setTheme] = useState(getTheme);
  const updateTheme = (newTheme: string) => {
    setTheme(newTheme as Theme);
    saveTheme(newTheme as Theme);
  };

  if (app.currentScreen === "profile")
    return (
      <Page title="You">
        {/* Profile Card matching Screen 11 */}
        <div className="p-4 rounded-3xl bg-surface-elevated border border-border-subtle shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full bg-surface-overlay border border-border-strong text-text-primary font-bold text-xl flex items-center justify-center shrink-0">
              {app.user?.name.charAt(0) || "H"}
            </div>
            <div>
              <h2 className="font-serif text-2xl font-bold text-text-primary tracking-tight">{app.user?.name}</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {["user-1", "user-2", "user-3", "user-4"].includes(app.user?.id || "") ? "Founder" : app.user?.role}
              </p>
              <p className="text-[10px] font-mono tracking-widest text-text-muted uppercase mt-0.5">
                HAN MEDIA FACTORY
              </p>
            </div>
          </div>
          <button
            onClick={() => setEditing({ table: "users", item: app.user as unknown as RecordData })}
            className="px-3.5 py-1.5 rounded-full bg-surface-overlay border border-border-strong hover:border-border-strong text-xs text-text-primary hover:text-text-primary transition-colors cursor-pointer"
          >
            Edit
          </button>
        </div>

        {/* 3-Column Stats Row matching Screen 11 */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle text-center">
            <p className="font-serif text-2xl font-bold text-text-primary">{app.projects.length}</p>
            <p className="text-[11px] text-text-secondary mt-0.5 font-sans">Projects</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle text-center">
            <p className="font-serif text-2xl font-bold text-text-primary">{app.tasks.filter((t) => t.completed).length}</p>
            <p className="text-[11px] text-text-secondary mt-0.5 font-sans">Completed</p>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle text-center">
            <p className="font-serif text-2xl font-bold text-text-primary">{app.tasks.filter((t) => t.date === today()).length}</p>
            <p className="text-[11px] text-text-secondary mt-0.5 font-sans">Tasks Today</p>
          </div>
        </div>

        {/* Menu Navigation List matching Screen 11 */}
        <div className="space-y-2 pt-1">
          <button
            onClick={() => setProfileSection(profileSection === "settings" ? null : "settings")}
            className="w-full p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Settings size={18} className="text-text-secondary group-hover:text-text-primary" />
              <span className="text-xs font-semibold text-text-primary">Workspace Settings</span>
            </div>
            <ChevronRight size={16} className={`text-text-muted transition-transform ${profileSection === "settings" ? "rotate-90" : ""}`} />
          </button>

          {profileSection === "settings" && (isOwner || app.can("projects.manage")) && (
            <div className="p-4 rounded-2xl bg-surface-overlay border border-border-subtle space-y-3 animate-fadeIn">
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
              <button
                className="han-btn-secondary"
                onClick={() => setEditing({ table: settingsTab })}
              >
                Add {titleFor[settingsTab]}
              </button>
              {app.state[settingsTab as "settings" | "categories"].map((item) => (
                <div key={item.id} className="han-card">
                  <p className="text-sm font-bold text-text-primary">{String(item.name)}</p>
                  <p className="text-xs text-text-secondary">
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
            </div>
          )}

          <button
            onClick={() => setProfileSection(profileSection === "theme" ? null : "theme")}
            className="w-full p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Sun size={18} className="text-text-secondary group-hover:text-text-primary" />
              <span className="text-xs font-semibold text-text-primary">Appearance & Theme</span>
            </div>
            <ChevronRight size={16} className={`text-text-muted transition-transform ${profileSection === "theme" ? "rotate-90" : ""}`} />
          </button>

          {profileSection === "theme" && (
            <div className="p-4 rounded-2xl bg-surface-overlay border border-border-subtle space-y-3 animate-fadeIn">
              <div className="flex gap-2 p-1 bg-surface-elevated border border-border-subtle rounded-xl">
                {[
                  { id: "light", icon: <Sun size={14} />, label: "Light" },
                  { id: "dark", icon: <Moon size={14} />, label: "Dark" },
                  { id: "system", icon: <Monitor size={14} />, label: "System" },
                ].map((t) => (
                  <button
                    key={t.id}
                    aria-pressed={theme === t.id}
                    onClick={() => updateTheme(t.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-lg transition-colors ${
                      theme === t.id
                        ? "bg-page text-text-primary shadow-sm"
                        : "text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-text-muted text-center mt-2 px-2">
                Choose the visual style that works best for you. System matches your device settings.
              </p>
            </div>
          )}

          <button
            onClick={() => app.navigateTo("team")}
            className="w-full p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Users size={18} className="text-text-secondary group-hover:text-text-primary" />
              <span className="text-xs font-semibold text-text-primary">Team & Accounts</span>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </button>

          <button
            onClick={() => setProfileSection(profileSection === "notifications" ? null : "notifications")}
            className="w-full p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-text-secondary group-hover:text-text-primary" />
              <span className="text-xs font-semibold text-text-primary">Notification Preferences</span>
            </div>
            <ChevronRight size={16} className={`text-text-muted transition-transform ${profileSection === "notifications" ? "rotate-90" : ""}`} />
          </button>

          {profileSection === "notifications" && (
            <div className="p-4 rounded-2xl bg-surface-overlay border border-border-subtle space-y-3 animate-fadeIn">
              <label className="flex items-center gap-3 text-xs text-text-primary">
                <input
                  type="checkbox"
                  checked={alertEnabled}
                  onChange={(event) => {
                    setAlertEnabled(event.target.checked);
                    localStorage.setItem(`han_alerts_${app.user!.id}`, event.target.checked ? "on" : "off");
                    if (!event.target.checked) app.dismissNotificationAlert();
                  }}
                  className="w-4 h-4 rounded border-border-strong bg-neutral-900 accent-white"
                />
                Show alerts while HAN is open
              </label>
              <PushPreferences />
            </div>
          )}

          <button
            onClick={() => setProfileSection(profileSection === "password" ? null : "password")}
            className="w-full p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Lock size={18} className="text-text-secondary group-hover:text-text-primary" />
              <span className="text-xs font-semibold text-text-primary">Change Password</span>
            </div>
            <ChevronRight size={16} className={`text-text-muted transition-transform ${profileSection === "password" ? "rotate-90" : ""}`} />
          </button>

          {profileSection === "password" && (
            <div className="p-4 rounded-2xl bg-surface-overlay border border-border-subtle animate-fadeIn">
              <PasswordForm />
            </div>
          )}

          <button
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
            className="w-full p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Download size={18} className="text-text-secondary group-hover:text-text-primary" />
              <span className="text-xs font-semibold text-text-primary">Download Backup</span>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </button>

          <button
            onClick={() => app.navigateTo("calendar")}
            className="w-full p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <FileText size={18} className="text-text-secondary group-hover:text-text-primary" />
              <span className="text-xs font-semibold text-text-primary">Calendar</span>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </button>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("han:play-intro"))}
            className="w-full p-4 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-strong flex items-center justify-between text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <Eye size={18} className="text-text-secondary group-hover:text-text-primary" />
              <span className="text-xs font-semibold text-text-primary">Watch HAN Entry Film</span>
            </div>
            <ChevronRight size={16} className="text-text-muted" />
          </button>

          {/* Privacy Policy & Terms */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("han:open-privacy"))}
              className="p-3 rounded-xl bg-surface-elevated border border-border-subtle hover:border-border-strong text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors text-center cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("han:open-terms"))}
              className="p-3 rounded-xl bg-surface-elevated border border-border-subtle hover:border-border-strong text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors text-center cursor-pointer"
            >
              Terms of Service
            </button>
          </div>

          {/* Expandable FAQ */}
          <div className="pt-2">
            <ExpandableFAQ compact={true} />
          </div>

          <button
            onClick={() => void app.logout()}
            disabled={app.busy}
            className="w-full p-4 rounded-2xl bg-[#181113] border border-red-950/60 hover:border-red-800/80 flex items-center justify-between text-left transition-colors cursor-pointer group mt-2"
          >
            <div className="flex items-center gap-3">
              <LogOut size={18} className="text-red-400" />
              <span className="text-xs font-semibold text-red-400">Sign out / switch identity</span>
            </div>
            <ChevronRight size={16} className="text-red-500" />
          </button>
        </div>

        {/* Feed & Audit Logs */}
        <TeamWorkspaceFeed />

        {(isOwner || app.can("finance.view") || app.can("projects.manage") || app.can("tasks.manage")) && (
          <AuditLogStream logs={app.state.activity_logs as any[]} />
        )}

        {app.pendingMutations.length > 0 && (
          <section className="p-4 rounded-2xl bg-surface-overlay border border-border-subtle space-y-3" aria-label="Pending changes">
            <h2 className="font-semibold text-sm text-text-primary">Pending changes ({app.pendingMutations.length})</h2>
            <p className="text-xs text-text-secondary">Queued changes have not been confirmed. Resolve a rejected change before later changes can sync.</p>
            {app.pendingMutations.map(change => (
              <div key={change.id} className="border-t border-border-subtle pt-2 text-xs">
                <p className="text-text-primary">{change.method} · {change.path.split("/")[0]} · {change.timestamp}</p>
                <p role={change.error ? "alert" : undefined} className={change.error ? "text-red-400" : "text-text-secondary"}>
                  {change.error || "Waiting to sync"}
                </p>
                <button className="underline text-text-secondary hover:text-text-primary mt-1 cursor-pointer" onClick={() => { if (window.confirm("Discard this unsynced change?")) app.discardPendingMutation(change.id); }}>
                  Discard queued change
                </button>
              </div>
            ))}
            <button className="han-btn-secondary" disabled={app.syncing} onClick={() => void app.restore()}>Retry sync</button>
          </section>
        )}

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
      onBack={
        detail
          ? () => app.navigateTo(table === "projects" ? "projects" : "funnels")
          : undefined
      }
      rightAction={
        detail && table === "projects" && list[0] ? (
          <div className="flex items-center gap-1.5">
            <button
              aria-label="Edit project"
              onClick={() => setEditing({ table: "projects", item: list[0] })}
              className="w-10 h-10 flex items-center justify-center rounded-full active:bg-neutral-800 transition-colors bg-surface-elevated text-text-primary border border-border-subtle cursor-pointer"
            >
              <Pencil size={18} />
            </button>
            <button
              aria-label="Project options"
              onClick={() => setDeleting({ table: "projects", item: list[0] })}
              className="w-10 h-10 flex items-center justify-center rounded-full active:bg-neutral-800 transition-colors bg-surface-elevated text-text-primary border border-border-subtle cursor-pointer"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        ) : undefined
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
        ["tasks", "leads", "team_members"].includes(table) && (
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
                {t}
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
        <div className="space-y-3.5">
          {/* Projects Search Bar & Filter Button matching Screen 4 */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder="Search projects…"
              />
            </div>
            <button
              aria-label="Filter projects"
              className="w-10 h-10 rounded-xl bg-surface-overlay border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0"
            >
              <Filter size={18} />
            </button>
          </div>

          {/* Filter Chips matching Screen 4 */}
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
        </div>
      )}
      {table === "tasks" && (
        <section className="space-y-3" aria-label="Task filters">
        {/* Workspace Targets for To-Do Lists */}
        <WorkspaceTargetsWidget filterCategory="tasks" compact={true} />

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
        <p className="text-xs text-text-muted">{visible.length} shown · {app.tasks.filter(task => !["COMPLETED", "CANCELLED"].includes(task.status || "TODO")).length} open · {app.tasks.filter(task => task.completed).length} completed</p>
        </section>
      )}
      {table === "funnels" && !detail && (
        <div className="space-y-4">
          {/* Growth Sub-tabs matching Unified CRM and Funnel operations */}
          <div className="flex gap-2 border-b border-border-subtle pb-2 overflow-x-auto no-scrollbar">
            {(["Overview", "Leads", "Clients", "Follow-ups", "Calls", "Inquiries", "Analytics"] as const).map((tabName) => {
              const isActive = growthTab === tabName;
              return (
                <button
                  key={tabName}
                  onClick={() => setGrowthTab(tabName)}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-page text-text-primary font-bold shadow-sm"
                      : "bg-surface-overlay text-text-secondary hover:text-text-primary border border-border-subtle"
                  }`}
                >
                  {tabName}
                </button>
              );
            })}
          </div>

          {/* OVERVIEW TAB */}
          {growthTab === "Overview" && (
            <div className="space-y-4 animate-fadeIn">
              {/* 2x2 Metric Cards matching Screen 10 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-1">
                  <span className="text-[11px] font-sans text-text-secondary">Total Leads</span>
                  <p className="font-serif text-2xl font-bold text-text-primary tracking-tight">
                    {app.state.leads.length}
                  </p>
                  <p className="text-[10px] font-mono text-text-secondary">Workspace leads</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-1">
                  <span className="text-[11px] font-sans text-text-secondary">Won Leads</span>
                  <p className="font-serif text-2xl font-bold text-text-primary tracking-tight">
                    {app.state.leads.filter(l => l.status === "Won").length}
                  </p>
                  <p className="text-[10px] font-mono text-text-secondary">Closed deals</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-1">
                  <span className="text-[11px] font-sans text-text-secondary">Conversion Rate</span>
                  <p className="font-serif text-2xl font-bold text-text-primary tracking-tight">
                    {app.state.leads.length > 0
                      ? `${Math.round((app.state.leads.filter(l => l.status === "Won").length / app.state.leads.length) * 100)}%`
                      : "0%"}
                  </p>
                  <p className="text-[10px] font-mono text-text-secondary">Lead to client</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-1">
                  <span className="text-[11px] font-sans text-text-secondary">Total Income</span>
                  <p className="font-serif text-2xl font-bold text-text-primary tracking-tight">
                    {`₹${app.totalIncome.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                  </p>
                  <p className="text-[10px] font-mono text-text-secondary">Recorded income</p>
                </div>
              </div>

              {/* Growth Targets to Achieve */}
              <WorkspaceTargetsWidget filterCategory="growth" compact={true} />

              {/* Action Button: Manage leads (Satisfies Playwright tests) */}
              {write && (
                <button
                  className="han-btn-secondary w-full flex items-center justify-center gap-2"
                  onClick={() => app.navigateTo("leads")}
                >
                  <span>Manage leads</span>
                  <ArrowRight size={15} />
                </button>
              )}

              {/* Active Funnels List */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-bold text-text-primary">Active Funnels</h3>
                  <span className="text-xs font-mono text-text-secondary">{app.funnels.length}</span>
                </div>
                {visible.length === 0 ? (
                  <div className="p-6 text-center bg-surface-elevated border border-border-subtle rounded-2xl space-y-2">
                    <p className="text-xs text-text-secondary">No active funnels configured.</p>
                    {write && (
                      <button
                        className="text-xs text-text-primary underline cursor-pointer"
                        onClick={() => setEditing({ table: "funnels" })}
                      >
                        + Create Funnel
                      </button>
                    )}
                  </div>
                ) : (
                  visible.map((funnel) => (
                    <div key={funnel.id} className="space-y-1">
                      <FunnelCard
                        funnel={app.funnels.find((f) => f.id === funnel.id)!}
                        onClick={() => app.selectFunnel(funnel.id)}
                      />
                      <Actions
                        table="funnels"
                        item={funnel}
                        edit={() => setEditing({ table: "funnels", item: funnel })}
                        remove={() => setDeleting({ table: "funnels", item: funnel })}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* LEADS TAB */}
          {growthTab === "Leads" && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base font-bold text-text-primary">Lead Pipeline</h3>
                {write && (
                  <button
                    onClick={() => setEditing({ table: "leads" })}
                    className="px-3 py-1.5 rounded-xl bg-page text-text-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Plus size={14} />
                    <span>Add Lead</span>
                  </button>
                )}
              </div>
              <KanbanPipeline
                leads={app.state.leads as any[]}
                canManage={write}
                onRemove={(lead) => setDeleting({ table: "leads", item: lead as unknown as RecordData })}
                onEdit={(lead) => setEditing({ table: "leads", item: lead as unknown as RecordData })}
                onStatusChange={(leadId, status) =>
                  void app.mutate(`leads/${leadId}`, "PATCH", { status })
                }
              />
            </div>
          )}

          {/* CLIENTS TAB - Full Operational CRM */}
          {growthTab === "Clients" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-text-primary">Client Accounts</h3>
                  <p className="text-[11px] text-text-secondary">Direct accounts & converted pipeline clients</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-secondary">
                    {app.state.clients.length + app.state.leads.filter(l => l.status === "Won").length}
                  </span>
                  {write && (
                    <button
                      onClick={() => setEditing({ table: "clients" })}
                      className="px-3 py-1.5 rounded-xl bg-page text-text-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Plus size={14} />
                      <span>New Client</span>
                    </button>
                  )}
                </div>
              </div>
              {app.state.clients.length === 0 && app.state.leads.filter(l => l.status === "Won").length === 0 ? (
                <div className="p-6 text-center bg-surface-elevated border border-border-subtle rounded-2xl space-y-2">
                  <p className="text-xs text-text-secondary">No client accounts recorded yet.</p>
                  <p className="text-[11px] text-text-muted">Create a new client account or convert a lead from your pipeline.</p>
                  {write && (
                    <button
                      className="text-xs text-text-primary font-bold underline cursor-pointer mt-1 inline-block"
                      onClick={() => setEditing({ table: "clients" })}
                    >
                      + Add First Client
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Dedicated Client Records */}
                  {app.state.clients.map(client => (
                    <div key={client.id} className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-surface-overlay border border-border-subtle flex items-center justify-center shrink-0 font-bold text-xs text-text-primary">
                            {client.initials || client.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-sans font-bold text-sm text-text-primary">{client.name}</h4>
                            <p className="text-xs text-text-secondary">{client.tagline || client.service}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            client.stage === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                            client.stage === 'Proposal' ? 'bg-amber-500/10 text-amber-500' :
                            'bg-surface-overlay text-text-secondary'
                          }`}>
                            {client.stage}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            client.account_health === 'Healthy' || client.account_health === 'Strong' ? 'text-emerald-500' : 'text-amber-500'
                          }`}>
                            ● {client.account_health}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border-subtle">
                        <div>
                          <span className="text-[10px] text-text-muted">Contact</span>
                          <p className="text-text-primary font-medium">{client.contact_person} ({client.contact_role || 'POC'})</p>
                          <p className="text-[11px] text-text-secondary">{client.phone} · {client.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-text-muted">Contract & Milestone</span>
                          <p className="font-mono text-text-primary font-bold">{client.contract_value ? `₹${client.contract_value}` : 'Retainer'}</p>
                          <p className="text-[11px] text-text-secondary">{client.next_milestone ? `${client.next_milestone} (${client.milestone_date || 'TBD'})` : 'No upcoming milestone'}</p>
                        </div>
                      </div>

                      {client.notes && (
                        <p className="text-xs text-text-muted bg-surface-overlay p-2 rounded-xl italic">
                          "{client.notes}"
                        </p>
                      )}

                      {write && (
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditing({ table: "client_followups", initialValues: { company: client.name, person: client.contact_person } })}
                            className="px-2.5 py-1 rounded-lg bg-surface-overlay text-[11px] text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar size={12} />
                            <span>Schedule Follow-up</span>
                          </button>
                          <button
                            onClick={() => setEditing({ table: "client_calls", initialValues: { business: client.name, contact: client.contact_person, phone: client.phone } })}
                            className="px-2.5 py-1 rounded-lg bg-surface-overlay text-[11px] text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                          >
                            <Phone size={12} />
                            <span>Log Call</span>
                          </button>
                          <button
                            onClick={() => setEditing({ table: "clients", item: client as unknown as RecordData })}
                            className="p-1 text-text-secondary hover:text-text-primary cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleting({ table: "clients", item: client as unknown as RecordData })}
                            className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Won Leads Converted */}
                  {app.state.leads.filter(l => l.status === "Won").map(client => (
                    <div key={client.id} className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-between opacity-90">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-surface-overlay border border-border-subtle flex items-center justify-center shrink-0">
                          <Building size={16} className="text-text-secondary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-sans font-bold text-sm text-text-primary">{client.name}</h4>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay text-text-muted">Converted Lead</span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">{client.source || "Direct Client"} · {client.category || "General"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="badge-today">Won</span>
                        {client.dealValue ? <p className="font-mono text-xs font-bold text-text-primary mt-1">₹{Number(client.dealValue).toLocaleString('en-IN')}</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FOLLOW-UPS TAB */}
          {growthTab === "Follow-ups" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-text-primary">Client Follow-ups</h3>
                  <p className="text-[11px] text-text-secondary">Scheduled agenda & outreach tasks</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-secondary">{app.state.client_followups.length}</span>
                  {write && (
                    <button
                      onClick={() => setEditing({ table: "client_followups" })}
                      className="px-3 py-1.5 rounded-xl bg-page text-text-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Plus size={14} />
                      <span>Schedule</span>
                    </button>
                  )}
                </div>
              </div>
              {app.state.client_followups.length === 0 ? (
                <div className="p-6 text-center bg-surface-elevated border border-border-subtle rounded-2xl space-y-2">
                  <p className="text-xs text-text-secondary">No follow-ups currently scheduled.</p>
                  <p className="text-[11px] text-text-muted">Keep clients engaged by scheduling regular syncs and check-ins.</p>
                  {write && (
                    <button
                      className="text-xs text-text-primary font-bold underline cursor-pointer mt-1 inline-block"
                      onClick={() => setEditing({ table: "client_followups" })}
                    >
                      + Schedule Follow-up
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {app.state.client_followups.map(item => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.status === 'Due Today' ? 'bg-amber-500/10 text-amber-500' :
                            item.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                            item.status === 'Overdue' ? 'bg-red-500/10 text-red-500' :
                            'bg-surface-overlay text-text-secondary'
                          }`}>
                            {item.status}
                          </span>
                          <span className="text-xs font-bold text-text-primary">{item.company}</span>
                          <span className="text-xs text-text-muted">· {item.person}</span>
                        </div>
                        <p className="text-xs text-text-secondary">{item.purpose}</p>
                        <p className="text-[11px] text-text-muted flex items-center gap-1">
                          <Calendar size={11} />
                          <span>{item.due_date || 'Today'} at {item.time_str}</span>
                        </p>
                      </div>
                      {write && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.status !== 'Completed' && (
                            <button
                              onClick={() => void app.mutate(`client_followups/${item.id}`, "PATCH", { status: 'Completed' })}
                              className="p-1.5 rounded-lg bg-surface-overlay text-text-secondary hover:text-emerald-500 cursor-pointer"
                              title="Mark Completed"
                            >
                              <Check size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => setEditing({ table: "client_followups", item: item as unknown as RecordData })}
                            className="p-1.5 rounded-lg bg-surface-overlay text-text-secondary hover:text-text-primary cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleting({ table: "client_followups", item: item as unknown as RecordData })}
                            className="p-1.5 rounded-lg bg-surface-overlay text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CALLS TAB */}
          {growthTab === "Calls" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-text-primary">Call Logs</h3>
                  <p className="text-[11px] text-text-secondary">Inbound & outbound communication audit</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-secondary">{app.state.client_calls.length}</span>
                  {write && (
                    <button
                      onClick={() => setEditing({ table: "client_calls" })}
                      className="px-3 py-1.5 rounded-xl bg-page text-text-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Plus size={14} />
                      <span>Log Call</span>
                    </button>
                  )}
                </div>
              </div>
              {app.state.client_calls.length === 0 ? (
                <div className="p-6 text-center bg-surface-elevated border border-border-subtle rounded-2xl space-y-2">
                  <p className="text-xs text-text-secondary">No call records logged yet.</p>
                  <p className="text-[11px] text-text-muted">Track all client phone conversations and outcomes directly from mobile.</p>
                  {write && (
                    <button
                      className="text-xs text-text-primary font-bold underline cursor-pointer mt-1 inline-block"
                      onClick={() => setEditing({ table: "client_calls" })}
                    >
                      + Log First Call
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {app.state.client_calls.map(item => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.type === 'Inbound' ? 'bg-sky-500/10 text-sky-400' : 'bg-purple-500/10 text-purple-400'
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-xs font-bold text-text-primary">{item.business}</span>
                          <span className="text-xs text-text-muted">· {item.contact} ({item.phone})</span>
                        </div>
                        <p className="text-xs text-text-secondary font-medium">Outcome: {item.outcome}</p>
                        {item.notes && <p className="text-xs text-text-muted italic">"{item.notes}"</p>}
                        <p className="text-[10px] font-mono text-text-muted">{item.call_time || 'Recent'}</p>
                      </div>
                      {write && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setEditing({ table: "client_calls", item: item as unknown as RecordData })}
                            className="p-1.5 rounded-lg bg-surface-overlay text-text-secondary hover:text-text-primary cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleting({ table: "client_calls", item: item as unknown as RecordData })}
                            className="p-1.5 rounded-lg bg-surface-overlay text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* INQUIRIES TAB */}
          {growthTab === "Inquiries" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-base font-bold text-text-primary">Website Inquiries</h3>
                  <p className="text-[11px] text-text-secondary">Inbound project requests & qualification</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-text-secondary">{app.state.inquiries.length}</span>
                  {write && (
                    <button
                      onClick={() => setEditing({ table: "inquiries" })}
                      className="px-3 py-1.5 rounded-xl bg-page text-text-primary font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Plus size={14} />
                      <span>New Inquiry</span>
                    </button>
                  )}
                </div>
              </div>
              {app.state.inquiries.length === 0 ? (
                <div className="p-6 text-center bg-surface-elevated border border-border-subtle rounded-2xl space-y-2">
                  <p className="text-xs text-text-secondary">No inbound inquiries logged.</p>
                  <p className="text-[11px] text-text-muted">Inbound leads submitting the website contact form appear here in real time.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {app.state.inquiries.map(item => (
                    <div key={item.id} className="p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-sans font-bold text-sm text-text-primary">{item.brand}</h4>
                            <span className="text-xs text-text-muted">({item.name})</span>
                          </div>
                          <p className="text-xs text-text-secondary mt-0.5">{item.email} · {item.phone || 'No phone'}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.status === 'NEW' ? 'bg-amber-500/10 text-amber-500' :
                            item.status === 'WON' ? 'bg-emerald-500/10 text-emerald-500' :
                            'bg-surface-overlay text-text-secondary'
                          }`}>
                            {item.status}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-overlay text-text-muted">
                            {item.priority}
                          </span>
                        </div>
                      </div>

                      <div className="bg-surface-overlay p-2.5 rounded-xl text-xs text-text-secondary">
                        <span className="text-[10px] font-bold text-text-primary block mb-0.5">Brief / Message:</span>
                        {item.message}
                      </div>

                      {item.budget_band && (
                        <p className="text-xs text-text-muted">
                          <span className="font-semibold text-text-primary">Budget band:</span> {item.budget_band}
                        </p>
                      )}

                      {write && (
                        <div className="flex justify-end gap-2 pt-1 border-t border-border-subtle">
                          {item.status !== 'WON' && (
                            <button
                              onClick={() => {
                                void app.mutate("leads", "POST", {
                                  name: `${item.brand} (${item.name})`,
                                  category: "Website Inquiry",
                                  status: "New",
                                  email: item.email,
                                  phone: item.phone || "",
                                  source: "Website Inquiry",
                                  dealValue: 0,
                                  nextAction: `Qualify inquiry: ${item.message.slice(0, 50)}...`,
                                });
                                void app.mutate(`inquiries/${item.id}`, "PATCH", { status: 'IN_REVIEW' });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check size={12} />
                              <span>Convert to Lead</span>
                            </button>
                          )}
                          <button
                            onClick={() => setEditing({ table: "inquiries", item: item as unknown as RecordData })}
                            className="p-1 text-text-secondary hover:text-text-primary cursor-pointer"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleting({ table: "inquiries", item: item as unknown as RecordData })}
                            className="p-1 text-red-400 hover:text-red-300 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ANALYTICS TAB */}
          {growthTab === "Analytics" && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="font-serif text-base font-bold text-text-primary">Funnel Conversion Analytics</h3>
              <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Total Leads Pipeline</span>
                  <span className="font-mono font-bold text-text-primary">{app.state.leads.length}</span>
                </div>
                <div className="space-y-2.5 pt-2 border-t border-border-subtle">
                  {["New", "Contacted", "Interested", "Follow Up", "Won", "Lost"].map((stage) => {
                    const count = app.state.leads.filter(l => l.status === stage).length;
                    const pct = app.state.leads.length ? Math.round((count / app.state.leads.length) * 100) : 0;
                    return (
                      <div key={stage} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-text-primary">{stage}</span>
                          <span className="font-mono text-text-secondary">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${stage === "Won" ? "bg-emerald-400" : stage === "Lost" ? "bg-red-400" : "bg-text-secondary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
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
                <p className="text-xs text-text-muted mt-2">
                  Task · {readable(t.status || "TODO")}
                </p>
                {(isOwner || app.can("tasks.manage") || t.assignedUserId === app.user?.id) && t.status !== "CANCELLED" && <button disabled={app.busy} className="action underline" onClick={() => app.toggleTask(t.id)}>{t.completed ? "Reopen task" : "Complete task"}</button>}
              </div>
            ))}
          {app.tasks.filter((t) => t.date === app.selectedDate).length === 0 && visible.length === 0 && (
            <div className="p-6 text-center text-xs text-text-muted bg-page border rounded-2xl">
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
      {visible.length === 0 && table !== "leads" && table !== "calendar_events" && (table !== "funnels" || detail) && (
        <div className="p-8 text-center bg-page border border-border-subtle rounded-2xl space-y-3">
          <p className="text-sm font-semibold text-text-primary">
            {query
              ? `No ${titleFor[table] || "records"} matching "${query}"`
              : table === "notifications" ? "You're all caught up" : `No ${titleFor[table] || "items"} found`}
          </p>
          <p className="text-xs text-text-muted">
            {table === "notifications" ? "Task assignments and workspace updates will appear here." : write
              ? `Click the "+" button above to add a new ${singularTitleFor[table] || "record"}.`
              : "No data available."}
          </p>
        </div>
      )}
      {(table === "leads" || (table === "funnels" && !detail) ? [] : visible).map((item) => {
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
                        className="text-sm text-text-secondary mt-2 whitespace-pre-wrap"
                      >
                        {String(item[key])}
                      </p>
                    ) : null,
                )}
                {item.date ? (
                  <p className="text-xs text-text-muted mt-3">
                    {dateLabel(String(item.date))}
                  </p>
                ) : null}
                {table === "notifications" && <p className="text-xs text-text-muted mt-2">{item.category as string} · {new Date(String(item.timestamp)).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {item.read ? "Read" : "Unread"}</p>}
                {item.status ? (
                  <p className="text-xs uppercase tracking-wide mt-2">
                    {readable(String(item.status))}
                  </p>
                ) : null}
                {table === "tasks" && (
                  <>
                    <div className="flex items-center gap-2 mt-3 text-xs">
                      <span>Priority: {readable(String(item.priority))}</span>
                      {(isOwner || app.can('tasks.manage') || item.assignedUserId === app.user?.id) && (
                        <select
                          className="han-input"
                          aria-label={`Status for ${item.title}`}
                          disabled={app.busy}
                          value={String(item.status)}
                          onChange={event => void app.mutate(`tasks/${item.id}`, "PATCH", { status: event.target.value })}
                        >
                          {["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETED", "CANCELLED"].map(status => (
                            <option key={status} value={status}>{readable(status)}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Task Progress Bar & Quick Adjust */}
                    <div className="mt-3 pt-2.5 border-t border-border-subtle/60 flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-text-secondary font-medium">Task Progress</span>
                        <span className="font-mono font-bold text-text-primary bg-surface-elevated px-2 py-0.5 rounded border border-border-subtle">
                          {item.progress !== undefined ? Number(item.progress) : (item.completed ? 100 : 0)}%
                        </span>
                      </div>
                      <div className="w-full bg-surface-elevated rounded-full h-2 overflow-hidden border border-border-subtle/40">
                        <div
                          className={`h-full transition-all duration-300 ${item.completed ? 'bg-neutral-400' : 'bg-page'}`}
                          style={{ width: `${item.progress !== undefined ? Number(item.progress) : (item.completed ? 100 : 0)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-1 pt-0.5 flex-wrap">
                        <span className="text-[10px] font-mono uppercase text-text-muted">Update:</span>
                        <div className="flex items-center gap-1">
                          {[0, 25, 50, 75, 100].map(step => {
                            const cur = item.progress !== undefined ? Number(item.progress) : (item.completed ? 100 : 0);
                            return (
                              <button
                                key={step}
                                type="button"
                                disabled={app.busy}
                                onClick={() => app.updateTaskProgress(item.id, step)}
                                className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-all cursor-pointer ${
                                  cur === step
                                    ? 'bg-page text-text-primary font-bold border border-border-strong shadow-xs'
                                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary hover:bg-surface-overlay'
                                }`}
                                aria-label={`Set progress to ${step}%`}
                              >
                                {step}%
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Audit info: who updated the task progress and when */}
                      {(() => {
                        const audit = formatTaskAudit(item as any);
                        if (!audit) return null;
                        return (
                          <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border-subtle/30">
                            <span className="flex items-center gap-1.5 font-sans">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${item.completed ? 'bg-emerald-500' : Number(item.progress) > 0 ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                              {audit.text}
                            </span>
                            {audit.time && <span className="font-mono text-[10px] text-text-muted">{audit.time}</span>}
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
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
                    <p className="text-xs text-text-primary font-semibold bg-surface-elevated border border-neutral-300 px-2.5 py-1 rounded-lg inline-block">
                      Assigned Monthly Salary: {item.salary ? `₹${Number(item.salary).toLocaleString("en-IN")}` : "Not assigned"}
                    </p>
                    {(isOwner || app.can("finance.manage")) && (
                      <div className="pt-1">
                        <button
                          className="action text-xs font-semibold text-text-primary hover:underline flex items-center gap-1.5"
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
                    <p className="text-xs text-text-muted mt-3">
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
                  <div className="space-y-4 animate-fadeIn">
                    {/* Hero Banner with reviewly-hero.jpg matching Screen 5 */}
                    <div className="w-full aspect-video rounded-3xl overflow-hidden border border-border-subtle bg-surface-elevated relative shadow-2xl">
                      <img
                        src="/reviewly-hero.jpg"
                        alt={String(item.name)}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>

                    {/* Project Title & Subtitle */}
                    <div>
                      <h1 className="font-serif text-3xl font-bold text-text-primary tracking-tight leading-tight">
                        {String(item.name)}
                      </h1>
                      <p className="text-xs text-text-secondary font-sans mt-0.5">
                        {String(item.subtitle || "AI Review Generator")}
                      </p>
                      {Boolean(item.description) && (
                        <p className="text-xs text-text-primary mt-2 leading-relaxed">
                          {String(item.description)}
                        </p>
                      )}

                      {/* Badges & Deadline */}
                      <div className="flex items-center gap-2 mt-3">
                        {!!item.deadline && String(item.deadline) < today() && Number(item.progress) < 100 && (
                          <span className="badge-overdue">Overdue</span>
                        )}
                        <span className="text-[11px] font-mono text-text-secondary">
                          {item.deadline ? `Deadline ${dateLabel(String(item.deadline))}` : "No deadline"}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3.5 flex items-center gap-2.5">
                        <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-page rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-text-secondary shrink-0">
                          {Number(item.progress)}%
                        </span>
                      </div>
                    </div>

                    {/* Project Tabs matching Screen 5: Tasks, Files, Notes, Activity */}
                    <div className="flex gap-2 border-b border-border-subtle pb-2">
                      {(["Tasks", "Files", "Notes", "Activity"] as const).map((subTab) => {
                        const isActive = projectSubTab === subTab;
                        return (
                          <button
                            key={subTab}
                            onClick={() => setProjectSubTab(subTab)}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? "bg-page text-text-primary"
                                : "bg-surface-overlay text-text-secondary hover:text-text-primary border border-border-subtle"
                            }`}
                          >
                            {subTab}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tasks Tab Content */}
                    {projectSubTab === "Tasks" && (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          {app.tasks
                            .filter((t) => t.projectId === item.id)
                            .map((t) => {
                              const taskProg = t.progress !== undefined ? Number(t.progress) : (t.completed ? 100 : 0);
                              const audit = formatTaskAudit(t);
                              return (
                                <div
                                  key={t.id}
                                  className="flex flex-col p-3.5 rounded-2xl bg-surface-elevated border border-border-subtle shadow-sm gap-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <button
                                        onClick={() => app.toggleTask(t.id)}
                                        disabled={app.busy}
                                        className="shrink-0 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                                        aria-label={t.completed ? "Mark pending" : "Mark complete"}
                                      >
                                        {t.completed ? (
                                          <CheckCircle2 size={19} className="text-text-primary" />
                                        ) : (
                                          <Circle size={19} className="text-text-muted" />
                                        )}
                                      </button>
                                      <div className="min-w-0 flex-1">
                                        <p className={`text-xs font-semibold truncate ${t.completed ? "line-through text-text-muted" : "text-text-primary"}`}>
                                          {t.title}
                                        </p>
                                        <p className="text-[10px] text-text-muted mt-0.5">
                                          {readable(t.status || "TODO")} · {taskProg}% {t.assignedUserName ? `· Assigned to ${t.assignedUserName}` : ""}
                                        </p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => app.toggleTask(t.id)}
                                      disabled={app.busy}
                                      className="text-[11px] underline text-text-secondary hover:text-text-primary cursor-pointer shrink-0 ml-2"
                                    >
                                      {t.completed ? "Reopen" : "Complete"}
                                    </button>
                                  </div>

                                  {/* Progress bar & quick steps */}
                                  <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border-subtle/40">
                                    <div className="flex-1 bg-surface-overlay rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className={`h-full transition-all duration-300 ${t.completed ? 'bg-neutral-400' : 'bg-page'}`}
                                        style={{ width: `${taskProg}%` }}
                                      />
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {[0, 25, 50, 75, 100].map(step => (
                                        <button
                                          key={step}
                                          type="button"
                                          disabled={app.busy}
                                          onClick={() => app.updateTaskProgress(t.id, step)}
                                          className={`text-[9px] px-1.5 py-0.5 rounded font-mono transition-all cursor-pointer ${
                                            taskProg === step
                                              ? 'bg-page text-text-primary font-bold border border-border-strong'
                                              : 'bg-surface-overlay text-text-muted hover:text-text-primary'
                                          }`}
                                        >
                                          {step}%
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Audit info: who updated the task progress and when */}
                                  {audit && (
                                    <div className="flex items-center justify-between text-[10px] text-text-muted pt-0.5">
                                      <span className="flex items-center gap-1 font-sans">
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${t.completed ? 'bg-emerald-500' : taskProg > 0 ? 'bg-blue-500' : 'bg-neutral-400'}`} />
                                        {audit.text}
                                      </span>
                                      {audit.time && <span className="font-mono text-[9px] text-text-muted">{audit.time}</span>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>

                        {/* Add Task Button matching Screen 5 */}
                        {(isOwner || app.can("tasks.manage")) && (
                          <button
                            aria-label="Add task"
                            onClick={() =>
                              setEditing({
                                table: "tasks",
                                initialValues: { projectId: item.id, date: today() },
                              })
                            }
                            className="w-full py-3 px-4 rounded-xl bg-surface-overlay border border-border-subtle hover:border-border-strong text-xs font-semibold text-text-primary flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                          >
                            <Plus size={15} /> Add Task
                          </button>
                        )}

                        {/* Manage Tasks button for navigation & tests */}
                        <button
                          className="han-btn-secondary"
                          onClick={() => app.navigateTo("tasks")}
                        >
                          Manage tasks
                        </button>
                      </div>
                    )}

                    {/* Files Tab Content */}
                    {projectSubTab === "Files" && (
                      <div className="space-y-2">
                        {["repoUrl", "previewUrl", "docsUrl"].some((k) => item[k]) ? (
                          ["repoUrl", "previewUrl", "docsUrl"]
                            .filter((k) => item[k])
                            .map((k) => (
                              <a
                                className="p-3 rounded-xl bg-surface-elevated border border-border-subtle flex items-center justify-between text-xs text-text-primary hover:border-border-strong transition-colors"
                                key={k}
                                href={String(item[k])}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <span>
                                  {k === "repoUrl" ? "Repository" : k === "previewUrl" ? "Live Preview" : "Documentation"}
                                </span>
                                <ArrowRight size={14} className="text-text-secondary" />
                              </a>
                            ))
                        ) : (
                          <p className="text-xs text-text-muted py-4 text-center">No links or files configured.</p>
                        )}
                      </div>
                    )}

                    {/* Notes Tab Content */}
                    {projectSubTab === "Notes" && (
                      <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle text-xs text-text-primary whitespace-pre-wrap">
                        {String(item.notes || "No notes documented for this project.")}
                      </div>
                    )}

                    {/* Activity Tab Content */}
                    {projectSubTab === "Activity" && (
                      <div className="p-4 rounded-2xl bg-surface-elevated border border-border-subtle space-y-2 text-xs">
                        <p className="text-text-primary font-semibold">Team Members</p>
                        <p className="text-text-secondary">{(item.teamMembers as string[] || []).join(", ")}</p>
                        <p className="text-text-muted pt-2 border-t border-border-subtle">
                          Progress source: {item.progressSource === "tasks" ? "Calculated from non-cancelled tasks" : "Manual estimate"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {table === "funnels" && detail && (
                  <div className="mt-4 space-y-3">
                    {/* Step Completion Summary Banner */}
                    {Array.isArray(item.steps) && (
                      <div className="p-3.5 rounded-2xl bg-surface-overlay border border-border-subtle space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-text-primary">Funnel Execution Progress</span>
                          <span className="font-mono text-emerald-400 font-bold">
                            {(item.steps as Step[]).filter((s) => s.status === "Completed").length} / {(item.steps as Step[]).length} Completed
                          </span>
                        </div>
                        <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border-subtle">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                            style={{
                              width: `${(item.steps as Step[]).length > 0 ? Math.round(((item.steps as Step[]).filter((s) => s.status === "Completed").length / (item.steps as Step[]).length) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {(item.steps as Step[]).map((step, idx) => (
                        <div
                          key={step.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-overlay border border-border-subtle hover:border-border-strong transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center font-mono text-[11px] font-bold text-text-secondary shrink-0">
                              {idx + 1}
                            </span>
                            <p className="text-xs font-semibold text-text-primary truncate">{step.title}</p>
                          </div>
                          <button
                            className="action px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer shrink-0"
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
  onBack,
  rightAction,
}: {
  title: string;
  children: ReactNode;
  onAdd?: () => void;
  onBack?: () => void;
  rightAction?: ReactNode;
}) {
  const app = useApp();
  return (
    <div className="workspace-page h-full flex flex-col">
      <ScreenHeader
        title={title}
        onBack={onBack || (() => app.navigateTo("home"))}
        showPlus={!!onAdd}
        onPlusClick={onAdd}
        rightAction={rightAction}
      />
      <main className="workspace-content flex-1 min-h-0 overflow-y-auto p-5 pt-2 space-y-4">
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
      <p className="text-sm text-text-secondary">Accounts control sign-in and permissions. Team profiles below are descriptive records and do not grant access.</p>
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
                className="absolute right-3 p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <p className="text-xs text-text-muted">
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
                className="absolute right-3 p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
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
                className="absolute right-3 p-2 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
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
