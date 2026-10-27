import React, { useState, useEffect } from "react";

export const ScrollProgress: React.FC = () => {
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      if (total <= 0) {
        setScrollPct(0);
        return;
      }
      const current = window.scrollY || el.scrollTop;
      setScrollPct(Math.min(100, Math.max(0, Math.round((current / total) * 100))));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (scrollPct <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-0.5 z-[100] pointer-events-none bg-transparent"
    >
      <div
        className="scroll-progress-fill h-full transition-all duration-150 ease-out"
        style={{ width: `${scrollPct}%` }}
      />
    </div>
  );
};
