import React, { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export const BackToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll back to top"
      className="fixed bottom-24 right-5 z-40 p-2.5 rounded-full bg-surface-elevated/90 backdrop-blur-md border border-border-strong text-text-primary shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer group"
    >
      <ArrowUp size={16} className="group-hover:-translate-y-0.5 transition-transform" />
    </button>
  );
};
