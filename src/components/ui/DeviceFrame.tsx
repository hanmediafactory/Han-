import React, { useState } from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ScreenType } from '../../types';

interface DeviceFrameProps {
  children: React.ReactNode;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ children }) => {
  const { currentScreen, navigateTo } = useApp();
  const [deviceModel, setDeviceModel] = useState<'390' | '375' | '430' | '393' | 'full'>('390');

  const dimensions = {
    '390': { width: 390, height: 844, label: 'iPhone 15 (390×844)' },
    '375': { width: 375, height: 812, label: 'iPhone SE (375×812)' },
    '430': { width: 430, height: 932, label: 'Pro Max (430×932)' },
    '393': { width: 393, height: 852, label: 'Android (393×852)' },
    full: { width: '100%', height: '100%', label: 'Fullscreen' },
  };

  const screensList: { id: ScreenType; label: string }[] = [
    { id: 'splash', label: '1. Splash' },
    { id: 'onboarding', label: '2. Onboarding' },
    { id: 'home', label: '3. Home' },
    { id: 'projects', label: '4. Projects' },
    { id: 'project-details', label: '5. Project Details' },
    { id: 'tasks', label: '6. Tasks' },
    { id: 'money', label: '7. Money' },
    { id: 'team', label: '8. Team' },
    { id: 'funnels', label: '9. Funnels' },
    { id: 'funnel-details', label: '10. Funnel Details' },
    { id: 'leads', label: '11. Leads' },
    { id: 'calendar', label: '12. Calendar' },
    { id: 'notifications', label: '13. Notifications' },
    { id: 'add-expense', label: '14. Add Expense' },
    { id: 'profile', label: '15. Profile' },
  ];

  const isDarkScreen = currentScreen === 'splash' || currentScreen === 'funnel-details';

  return (
    <div className="app-simulator-container select-none">
      {/* Top Toolbar for Testing Devices & Jumping Screens */}
      <div className="simulator-toolbar">
        <div className="simulator-title">
          <span>HAN</span> MOBILE OS
        </div>

        <div className="h-4 w-px bg-white/20" />

        {/* Viewport size buttons */}
        <div className="flex items-center gap-1">
          {(['390', '375', '430', '393', 'full'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setDeviceModel(key)}
              className={`device-btn ${deviceModel === key ? 'active' : ''}`}
            >
              {key === 'full' ? 'Full Web' : `${dimensions[key].width}px`}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-white/20" />

        {/* Screen Quick Jump dropdown */}
        <div className="flex items-center gap-1 text-[11px] overflow-x-auto max-w-xs no-scrollbar">
          <select
            value={currentScreen}
            onChange={(e) => navigateTo(e.target.value as ScreenType)}
            className="bg-black text-white text-xs px-2 py-1 rounded-full border border-white/20 outline-none cursor-pointer"
          >
            {screensList.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Frame */}
      <div
        className={`phone-viewport-container ${deviceModel === 'full' ? 'fullscreen-mode' : ''}`}
        style={{
          width: deviceModel === 'full' ? '100vw' : `${dimensions[deviceModel].width}px`,
          height: deviceModel === 'full' ? '100vh' : `${dimensions[deviceModel].height}px`,
        }}
      >
        {/* Dynamic Island Notch */}
        {deviceModel !== 'full' && (
          <div className="dynamic-island">
            <div className="camera-lens" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-900/40 border border-blue-500/20" />
          </div>
        )}

        {/* Status Bar */}
        {deviceModel !== 'full' && (
          <div
            className={`mobile-status-bar ${isDarkScreen ? 'dark-status' : 'light-status'}`}
          >
            <span className="text-[12px] font-bold tracking-tight">9:41</span>
            <div className="flex items-center gap-1.5 text-xs">
              <Signal size={12} strokeWidth={2.5} />
              <Wifi size={12} strokeWidth={2.5} />
              <Battery size={14} strokeWidth={2.5} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className={`mobile-screen-body ${isDarkScreen ? 'black-bg' : ''}`}>
          {children}
        </div>

        {/* Home Indicator Bar */}
        {deviceModel !== 'full' && (
          <div className={`home-indicator ${isDarkScreen ? 'white-indicator' : ''}`} />
        )}
      </div>
    </div>
  );
};
