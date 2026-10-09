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
  status?: 'TODO'|'IN_PROGRESS'|'COMPLETED'|'CANCELLED';
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

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  type: 'expense' | 'income';
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
