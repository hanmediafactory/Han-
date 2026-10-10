import React from 'react';
import { Home, Wallet, Briefcase, TrendingUp, User } from 'lucide-react';
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
              color={isActive ? 'var(--text-primary)' : 'var(--text-muted)'}
            />
            <span style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
