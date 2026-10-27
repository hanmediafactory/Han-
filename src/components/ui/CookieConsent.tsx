import React, { useState, useEffect } from "react";
import { ShieldCheck, X } from "lucide-react";

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("han_cookie_consent");
      if (!consent) {
        // Small delay for smooth appearance
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem("han_cookie_consent", "accepted");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const handleDecline = () => {
    try {
      localStorage.setItem("han_cookie_consent", "essential_only");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie and privacy consent"
      role="region"
      className="privacy-consent fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[9500] p-4 rounded-2xl bg-surface-elevated/95 backdrop-blur-md border border-border-strong shadow-2xl text-xs space-y-3 animate-fadeIn"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck size={16} />
          </div>
          <h4 className="font-bold text-text-primary">Workspace Privacy & Cookies</h4>
        </div>
        <button
          onClick={handleDecline}
          aria-label="Dismiss cookie banner"
          className="text-text-muted hover:text-text-primary p-0.5 cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      <p className="text-[11px] text-text-secondary leading-relaxed">
        HAN uses local storage and essential session tokens to preserve offline data, protect
        financial integrity, and remember your workspace theme. No invasive third-party ad tracking.
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={handleDecline}
          className="px-3 py-1.5 rounded-xl bg-surface-overlay hover:bg-surface border border-border-subtle text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
        >
          Essential Only
        </button>
        <button
          onClick={handleAccept}
          className="px-4 py-1.5 rounded-xl bg-page text-text-primary text-[11px] font-bold shadow-md hover:bg-neutral-200 transition-colors cursor-pointer"
        >
          Accept All
        </button>
      </div>
    </aside>
  );
};
