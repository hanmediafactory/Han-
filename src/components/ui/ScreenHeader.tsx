import React from 'react';
import { ChevronLeft, Plus, Bell, MoreVertical, Settings } from 'lucide-react';

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showPlus?: boolean;
  onPlusClick?: () => void;
  showBell?: boolean;
  unreadCount?: number;
  onBellClick?: () => void;
  showSettings?: boolean;
  onSettingsClick?: () => void;
  showMore?: boolean;
  onMoreClick?: () => void;
  rightAction?: React.ReactNode;
  dark?: boolean;
  className?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showPlus,
  onPlusClick,
  showBell,
  unreadCount = 0,
  onBellClick,
  showSettings,
  onSettingsClick,
  showMore,
  onMoreClick,
  rightAction,
  className = '',
}) => {
  return (
    <div
      className={`w-full flex items-center justify-between px-5 pt-12 pb-3 select-none bg-[#000000] ${className}`}
    >
      <div className="flex items-center gap-2">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center -ml-2 rounded-full active:bg-neutral-800 transition-colors text-white"
            aria-label="Go back"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
        )}
        {title && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#111111] p-1 rounded-lg border border-neutral-800 shadow-sm flex items-center justify-center shrink-0">
              <img src="/logo-clean.png" alt="" aria-hidden="true" className="w-full h-auto object-contain" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold tracking-tight leading-none text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs mt-1 font-sans font-medium text-neutral-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {rightAction}

        {showPlus && (
          <button
            onClick={onPlusClick}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-neutral-800 transition-colors bg-[#111111] text-white border border-neutral-800"
            aria-label={`Add ${title === 'Money' ? 'expense' : title === 'Projects' ? 'project' : title === 'Tasks' ? 'task' : (title === 'Funnels' || title === 'Growth') ? 'funnel' : title === 'Leads' ? 'lead' : title === 'Calendar' ? 'event' : title === 'Team' ? 'team profile' : 'record'}`}
          >
            <Plus size={20} strokeWidth={2} />
          </button>
        )}

        {showBell && (
          <button
            onClick={onBellClick}
            className="w-10 h-10 relative flex items-center justify-center rounded-full active:bg-neutral-800 transition-colors bg-[#111111] text-white border border-neutral-800"
            aria-label="Notifications"
          >
            <Bell size={19} strokeWidth={2} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white" />
            )}
          </button>
        )}

        {showSettings && (
          <button
            onClick={onSettingsClick}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-neutral-800 transition-colors bg-[#111111] text-white border border-neutral-800"
            aria-label="Settings"
          >
            <Settings size={19} strokeWidth={2} />
          </button>
        )}

        {showMore && (
          <button
            onClick={onMoreClick}
            className="w-10 h-10 flex items-center justify-center rounded-full active:bg-neutral-800 transition-colors bg-[#111111] text-white border border-neutral-800"
            aria-label="More options"
          >
            <MoreVertical size={19} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
};
