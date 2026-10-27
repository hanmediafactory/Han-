import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Wallet,
  TrendingUp,
  Users,
  Calendar,
  Settings,
  LogOut,
} from 'lucide-react';
import type { MainTabType } from '../../types';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab }) => {
  const {
    currentScreen,
    navigateTo,
    tasks,
    projects,
    leads,
    userProfile,
    user,
    logout,
  } = useApp();

  const overdueTasksCount = tasks.filter(
    (t) => !t.completed && t.status !== 'CANCELLED' && t.date && t.date < new Date().toISOString().split('T')[0]
  ).length;

  const activeProjectsCount = projects.filter((p) => p.category === 'Active' && !p.archived).length;

  const navItems: Array<{
    id: MainTabType | string;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    action: () => void;
    badge?: number;
    badgeAlert?: boolean;
  }> = [
    {
      id: 'home',
      label: 'Command Center',
      icon: LayoutDashboard,
      action: () => onSelectTab('home'),
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      action: () => {
        onSelectTab('work');
        navigateTo('projects');
      },
      badge: activeProjectsCount > 0 ? activeProjectsCount : undefined,
    },
    {
      id: 'tasks',
      label: 'Tasks & Sprints',
      icon: CheckSquare,
      action: () => {
        onSelectTab('work');
        navigateTo('tasks');
      },
      badge: overdueTasksCount > 0 ? overdueTasksCount : undefined,
      badgeAlert: overdueTasksCount > 0,
    },
    {
      id: 'growth',
      label: 'Pipeline & CRM',
      icon: TrendingUp,
      action: () => {
        onSelectTab('growth');
        navigateTo('leads');
      },
      badge: leads && leads.length > 0 ? leads.length : undefined,
    },
    {
      id: 'money',
      label: 'Treasury',
      icon: Wallet,
      action: () => onSelectTab('money'),
    },
    {
      id: 'team',
      label: 'Studio Team',
      icon: Users,
      action: () => navigateTo('team'),
    },
    {
      id: 'calendar',
      label: 'Schedule',
      icon: Calendar,
      action: () => navigateTo('calendar'),
    },
    {
      id: 'you',
      label: 'You & MFA',
      icon: Settings,
      action: () => {
        onSelectTab('you');
        navigateTo('profile');
      },
    },
  ];

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] bg-[#09090B] border-r border-border-subtle flex-col justify-between z-40 select-none shadow-xl"
      aria-label="Desktop Sidebar Navigation"
    >
      <div>
        <div className="h-14 px-4 flex items-center gap-3 border-b border-border-subtle bg-surface/50">
          <div className="w-7 h-7 rounded-lg bg-surface-elevated border border-strong flex items-center justify-center p-1 shrink-0">
            <img src="/logo-clean.png" alt="HAN" className="w-full h-auto object-contain" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-sm font-bold tracking-tight text-text-primary leading-tight truncate">
              HAN MEDIA FACTORY
            </h1>
            <p className="text-[9px] font-mono tracking-widest text-text-muted uppercase leading-tight">
              Command Center
            </p>
          </div>
        </div>

        <nav className="p-3 space-y-1" aria-label="Primary Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.id === 'home' && activeTab === 'home' && currentScreen === 'home') ||
              (item.id === 'projects' && currentScreen === 'projects') ||
              (item.id === 'tasks' && currentScreen === 'tasks') ||
              (item.id === 'growth' && (activeTab === 'growth' || currentScreen === 'leads')) ||
              (item.id === 'money' && activeTab === 'money') ||
              (item.id === 'team' && currentScreen === 'team') ||
              (item.id === 'calendar' && currentScreen === 'calendar') ||
              (item.id === 'you' && (activeTab === 'you' || currentScreen === 'profile'));

            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer group ${isActive ? 'bg-surface-elevated text-text-primary font-semibold border border-border-subtle shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent'}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2.2 : 1.7}
                    className={isActive ? 'text-text-primary' : 'text-text-muted group-hover:text-text-primary transition-colors'}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${item.badgeAlert ? 'bg-rose-950 text-rose-300 border border-rose-800/40' : 'bg-surface-overlay text-text-muted'}`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-border-subtle bg-surface/40">
        <div className="flex items-center justify-between p-2 rounded-xl bg-surface-elevated/70 border border-border-subtle/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-mg bg-surface border border-strong flex items-center justify-center text-xs font-bold text-text-primary shrink-0">
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'H'}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-semibold text-text-primary truncate leading-tight">
                {userProfile.name || 'Harsha'}
              </p>
              <p className="text-[9px] font-mono text-text-muted truncate uppercase tracking-wider leading-tight">
                {user?.role || 'FOUNDER'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="p-1.5 text-text-muted hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
};