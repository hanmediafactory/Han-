import React from 'react';
import { Home, Wallet, Briefcase, TrendingUp, User, Plus } from 'lucide-react';
import type { MainTabType } from '../../types';

interface BottomNavigationProps {
  activeTab: MainTabType;
  onSelectTab: (tab: MainTabType) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const tabs: { id: MainTabType; label: string; icon: React.ElementType }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'money', label: 'Money', icon: Wallet },
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'growth', label: 'Growth', icon: TrendingUp },
    { id: 'you', label: 'You', icon: User },
  ];

  return (
    <nav className="bottom-nav-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        const isCenter = tab.id === 'work';

        if (isCenter) {
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`bottom-nav-item bottom-nav-center ${isActive ? 'active' : ''}`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-white text-black shadow-lg shadow-white/10 scale-105'
                    : 'bg-[#18181C] text-white border border-neutral-700/80 hover:border-neutral-500'
                }`}
              >
                {activeTab === 'home' ? (
                  <Plus size={18} strokeWidth={2.5} />
                ) : (
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                )}
              </div>
              <span style={{ color: isActive ? '#FFFFFF' : '#5A5A5E' }}>
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              size={20}
              className="nav-icon"
              strokeWidth={isActive ? 2.4 : 1.7}
              color={isActive ? '#FFFFFF' : '#5A5A5E'}
            />
            <span style={{ color: isActive ? '#FFFFFF' : '#5A5A5E' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
