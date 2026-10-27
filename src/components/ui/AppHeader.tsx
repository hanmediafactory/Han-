import React from 'react';
import { Search, Bell } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, subtitle, rightAction }) => {
  const { currentScreen, unreadNotificationCount, navigateTo, user, userProfile } = useApp();

  const getBreadcrumb = () => {
    if (title) return title;
    switch (currentScreen) {
      case 'home': return 'Command Center';
      case 'tasks': return 'Tasks & Deadlines';
      case 'projects': return 'Projects';
      case 'money': return 'Treasury & Finance';
      case 'leads': return 'Pipeline & Growth';
      case 'team': return 'Studio Team';
      case 'calendar': return 'Production Schedule';
      case 'notifications': return 'Inbox';
      default: return currentScreen.charAt(0).toUpperCase() + currentScreen.slice(1);
    }
  };

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('han:open-command'));
  };

  return (
    <header className="hidden lg:flex items-center justify-between px-6 h-14 bg-surface/80 backdrop-blur-md border-b border-border-subtle select-none sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-[11p] font-mono uppercase tracking-wider text-text-muted">HAN OS</span>
        <span className="text-border-strong text-xs font-mono">/</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-tight text-text-primary">{getBreadcrumb()}</span>
          {subtitle && <span className="text-[11px] text-text-muted hidden xl:inline">— {subtitle}</span>}
        </div>
      </div>

      <div className="flex-1 max-w-md mx-6">
        <button
          type="button"
          onClick={handleOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border-subtle hover:border-border-strong text-text-muted hover:text-text-secondary transition-all cursor-pointer group shadow-sm text-xs"
          aria-label="Search workspace or launch command"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search size={14} className="text-text-muted group-hover:text-text-primary transition-colors" />
            <span className="truncate font-normal">Search projects, tasks, clients...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface border border-border-subtle font-mono text-[10px] text-text-muted group-hover:text-text-secondary">
            ⌚K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {rightAction}

        <button
          type="button"
          onClick={() => navigateTo('notifications')}
          className="relative p-2 rounded-mg bg-surface-elevated hover:bg-surface border border-border-subtle text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadNotificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-page" />
          )}
        </button>

        <div className="h-4 w-px bg-border-subtle mx-1" />

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-mg bg-surface-elevated border border-border-subtle">
          <div className="w-5 h-5 rounded-md bg-surface border border-border-strong flex items-center justify-center text-[10px] font-bold text-text-primary">
            {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : 'H'}
          </div>
          <span className="text-xs font-medium text-text-primary truncate max-w[100px]">
            {userProfile?.name || 'Harsha'}
          </span>
          <span className="text-[9px] font-mono uppercase px-1 py-0.5 rounded bg-surface text-text-muted border border-border-subtle">
            {['user-1', 'user-2', 'user-3', 'user-4'].includes(user?.id || '') ? 'FOUNDER' : user?.role || 'MEMBER'}
          </span>
        </div>
      </div>
    </header>
  );
};
