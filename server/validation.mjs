import { z } from "zod";
const text = z.string().trim().min(1).max(250);
const note = z.string().max(10000).default("");
const date = z.iso.date();
const user = z.string().trim().min(1).max(100);
const priority = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM");
export const money = z.number().positive().max(1e10).refine(v => Number.isSafeInteger(Math.round(v * 100)) && Math.abs(v * 100 - Math.round(v * 100)) < 0.0001, "Maximum two decimal places");
const url = z
  .union([
    z.literal(""),
    z.url().refine((v) => /^https?:\/\//.test(v), "Use an HTTP or HTTPS URL"),
  ])
  .optional();
export const schemas = {
  savings_entries: z.object({ title: text, amount: money, date, notes: note }),
  projects: z.object({
    name: text,
    subtitle: z.string().max(250).default(""),
    description: note,
    progress: z.number().min(0).max(100).default(0),
    deadline: z.union([date, z.literal("")]).default(""),
    priority,
    ownerId: user.default("user-1"),
    memberIds: z.array(user).min(1).max(100).refine(ids => new Set(ids).size === ids.length, "Members must be unique"),
    category: z.enum(["Active", "Completed"]).default("Active"),
    archived: z.boolean().default(false),
    notes: note,
    repoUrl: url,
    previewUrl: url,
    docsUrl: url,
  }),
  tasks: z.object({
    title: text,
    description: note,
    projectId: z.string().max(100).optional(),
    assignedUserId: user,
    date,
    timeSlot: z.string().max(100).default(""),
    startDate: z.union([date, z.literal("")]).default(""),
    estimatedTime: z.number().min(0).max(10000).default(0),
    notes: note,
    priority,
    status: z
      .enum(["TODO", "IN_PROGRESS", "BLOCKED", "IN_REVIEW", "COMPLETED", "CANCELLED"])
      .default("TODO"),
  }),
  expenses: z.object({
    account: z.literal("funds").default("funds"),
    title: text,
    description: note,
    amount: money,
    category: text,
    subcategory: z.string().max(100).default(""),
    date,
    notes: note,
    paidBy: user.default("user-1"),
    splitType: z.enum(["individual", "equal", "custom", "percentage"]).default("equal"),
    allocations: z.array(z.object({
      userId: user,
      amount: z.number().min(0).max(1e10).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001, "Maximum two decimal places"),
      percentage: z.number().min(0).max(100).optional(),
    })).optional(),
    projectId: z.string().max(100).optional(),
    vendor: z.string().max(250).default(""),
    paymentMethod: z.string().max(100).default("UPI"),
    receipt: z.string().max(10000).default(""),
    status: z.enum(["active", "void"]).default("active"),
    voidReason: z.string().max(500).default(""),
    voidedAt: z.string().max(100).optional(),
    voidedBy: user.optional(),
  }),
  settlements: z.object({
    payerId: user,
    recipientId: user,
    amount: money,
    date,
    paymentReference: z.string().max(250).default(""),
    notes: note,
    status: z.enum(["completed"]).default("completed"),
  }),
  income: z.object({
    title: text,
    amount: z
      .number()
      .positive()
      .max(1e10)
      .refine(
        (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001,
        "Maximum two decimal places",
      ),
    category: text,
    date,
    notes: note,
  }),
  team_members: z.object({
    name: text,
    role: text,
    initials: z.string().min(1).max(3),
    sharePercentage: z.string().max(20).default(""),
  }),
  leads: z.object({
    name: text,
    category: text,
    status: z.enum(["New", "Contacted", "Interested", "Follow Up", "Won", "Lost"]),
    email: z.union([z.email().max(250), z.literal("")]).default(""),
    phone: z.string().trim().max(50).default(""),
    dealValue: z.number().min(0).max(1e10).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.0001, "Maximum two decimal places").default(0),
    source: z.string().trim().max(250).default(""),
    followUpDate: z.union([date, z.literal("")]).default(""),
    assignedUserId: user.default("user-1"),
    nextAction: note,
  }),
  funnels: z.object({
    title: text,
    subtitle: z.string().max(250).default(""),
    description: note,
    steps: z
      .array(
        z.object({
          id: z.number().int().positive(),
          title: text,
          status: z.enum(["Completed", "In Progress", "Pending"]),
        }),
      )
      .max(100)
      .refine(
        (steps) => new Set(steps.map((s) => s.id)).size === steps.length,
        "Step IDs must be unique",
      ),
  }),
  calendar_events: z.object({
    title: text,
    date,
    assignedUserId: user,
    notes: note,
  }),
  categories: z.object({
    name: text,
    kind: z.enum(["project", "expense", "income", "lead"]),
  }),
  settings: z.object({ name: text, value: z.string().max(2000) }),
  notifications: z.object({
    title: text,
    subtitle: note,
    timestamp: z.string().max(100),
    category: z.enum(["Tasks", "Projects", "Payments", "General"]),
    read: z.boolean(),
    iconType: z.enum([
      "task",
      "lead",
      "payment",
      "project",
      "deadline",
      "team",
    ]),
    userId: user,
    targetScreen: z.enum(["projects", "tasks", "money", "leads", "funnels", "calendar", "team"]).optional(),
    targetId: z.string().max(100).optional(),
  }),
};
