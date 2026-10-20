export type ScreenType =
  | 'splash'
  | 'onboarding'
  | 'home'
  | 'projects'
  | 'project-details'
  | 'tasks'
  | 'money'
  | 'add-expense'
  | 'team'
  | 'funnels'
  | 'funnel-details'
  | 'leads'
  | 'calendar'
  | 'notifications'
  | 'profile';

export type MainTabType = 'home' | 'money' | 'work' | 'growth' | 'you';

export interface Task {
  status?: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';
  assignedUserId?: string;
  description?: string;
  priority?: string;
  notes?: string;
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  timeSlot: string;
  date: string; // e.g., '2026-10-03'
  completed: boolean;
  progress?: number; // 0 - 100
  completedBy?: string;
  completedByName?: string;
  completedAt?: string;
  progressUpdatedBy?: string;
  progressUpdatedByName?: string;
  progressUpdatedAt?: string;
  assignedUserName?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  category?: string;
}

export interface Project {
  memberIds?: string[];
  archived?: boolean;
  priority?: string;
  notes?: string;
  id: string;
  name: string;
  subtitle: string;
  description: string;
  progress: number; // 0 - 100
  deadline: string;
  daysLeft?: string;
  repoUrl?: string;
  previewUrl?: string;
  docsUrl?: string;
  teamMembers: string[];
  category: 'Active' | 'Completed';
}

export interface Allocation {
  userId: string;
  amount: number;
  percentage?: number;
}

export interface Expense {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: string;
  subcategory?: string;
  date: string;
  paidBy?: string;
  splitType?: 'individual' | 'equal' | 'custom' | 'percentage';
  allocations?: Allocation[];
  projectId?: string;
  vendor?: string;
  paymentMethod?: string;
  receipt?: string;
  status?: 'active' | 'void';
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  notes?: string;
  type: 'expense' | 'income';
}

export interface Settlement {
  id: string;
  payerId: string;
  recipientId: string;
  amount: number;
  date: string;
  paymentReference?: string;
  notes?: string;
  status?: 'completed';
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  salary?: number;
  sharePercentage?: string;
  initials: string;
}

export interface StepItem {
  id: number;
  title: string;
  status: 'Completed' | 'In Progress' | 'Pending';
}

export interface Funnel {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  completedDaysOrSteps: number;
  totalDaysOrSteps: number;
  imageBg?: string;
  steps: StepItem[];
}

export interface Lead {
  id: string;
  name: string;
  category: string; // e.g. Restaurant, Brand, Service, Scholarship, Job Opportunity
  status: 'New' | 'Contacted' | 'Interested' | 'Follow Up' | 'Won' | 'Lost';
  email?: string;
  phone?: string;
  dealValue?: number;
  source?: string;
  followUpDate?: string;
  assignedUserId?: string;
  nextAction?: string;
}

export interface ClientModel {
  id: string;
  name: string;
  tagline?: string;
  initials?: string;
  contact_person: string;
  contact_role?: string;
  phone: string;
  email: string;
  stage: 'Discovery' | 'Proposal' | 'Active' | 'On Hold' | 'Completed';
  service: string;
  account_health: 'Healthy' | 'Strong' | 'Good' | 'At Risk';
  health_note?: string;
  contract_value?: string;
  executive_producer?: string;
  scopes?: string[];
  next_milestone?: string;
  milestone_date?: string;
  notes?: string;
  last_interaction?: string;
}

export interface FollowupModel {
  id: string;
  client_id?: string;
  company: string;
  person: string;
  purpose: string;
  due_date?: string;
  time_str: string;
  status: 'Due Today' | 'Scheduled' | 'Overdue' | 'Completed';
}

export interface CallModel {
  id: string;
  client_id?: string;
  business: string;
  contact: string;
  phone: string;
  type: 'Inbound' | 'Outbound';
  outcome: string;
  notes?: string;
  call_time?: string;
}

export interface EmailModel {
  id: string;
  client_id?: string;
  party: string;
  subject: string;
  category: string;
  body?: string;
  status?: 'QUEUED' | 'ACCEPTED' | 'DELIVERED' | 'FAILED';
  email_time?: string;
}

export interface InquiryModel {
  id: string;
  name: string;
  brand: string;
  email: string;
  phone?: string;
  message: string;
  budget_band?: string;
  status: 'NEW' | 'IN_REVIEW' | 'SCOPING' | 'PROPOSAL_SENT' | 'WON' | 'ARCHIVED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  internal_notes?: string;
  assigned_to_user_id?: string;
}

export interface NotificationItem {
  created_by?: string;
  targetScreen?: ScreenType;
  targetId?: string;
  id: string;
  title: string;
  subtitle: string;
  timestamp: string;
  category: 'Tasks' | 'Projects' | 'Payments' | 'General';
  read: boolean;
  iconType: 'task' | 'lead' | 'payment' | 'project' | 'deadline' | 'team';
}

export interface UserProfile {
  name: string;
  greeting: string;
  role: string;
  subheading: string;
  avatarUrl: string;
  stats: {
    projectsCount: number;
    leadsCount: number;
    revenue: string;
  };
}

export interface FinanceGoal {
  id: string;
  title: string;
  category: 'Runway' | 'Equipment' | 'Expansion' | 'Tax Reserve' | 'Security';
  targetAmount: number;
  deadline?: string;
  description?: string;
  isDefault?: boolean;
}

export interface WorkspaceTarget {
  id: string;
  type: 'finance' | 'tasks' | 'growth';
  title: string;
  targetValue: number;
  currentValue?: number;
  unit: string;
  period: 'daily' | 'weekly' | 'monthly';
  completed?: boolean;
}
