import React, { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, VolumeX, Sparkles } from "lucide-react";

interface IntroVideoSplashProps {
  onComplete: () => void;
}

export const IntroVideoSplash: React.FC<IntroVideoSplashProps> = ({ onComplete }) => {
  const [fading, setFading] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setFading(true);
    setTimeout(() => {
      onComplete();
    }, 600);
  }, [onComplete]);

  // Automated test environment detection: skip automatically in headless test runners
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      (navigator.webdriver ||
        window.location.search.includes("skip-intro") ||
        window.location.search.includes("e2e"))
    ) {
      onComplete();
    }
  }, [onComplete]);

  // Fallback safety timer: in case autoplay is blocked or stalls, do not trap the user
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 8500);

    return () => clearTimeout(safetyTimer);
  }, [handleFinish]);

  // Keyboard shortcut: Escape or Space to skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFinish]);

  // Toggle audio
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // If in automated test, render nothing
  if (
    typeof navigator !== "undefined" &&
    (navigator.webdriver ||
      (typeof window !== "undefined" &&
        (window.location.search.includes("skip-intro") ||
          window.location.search.includes("e2e"))))
  ) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-700 ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundColor: "#000000",
      }}
      onClick={handleFinish}
    >
      {/* Top Controls Bar */}
      <div className="absolute top-0 left-0 right-0 p-5 z-20 flex items-center justify-between pointer-events-auto">
        {/* Brand indicator & sound toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[11px] font-mono tracking-widest uppercase">
            <Sparkles size={12} className="text-white animate-pulse" />
            <span>HAN MEDIA FACTORY</span>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/15 text-white transition-all cursor-pointer"
            aria-label={isMuted ? "Unmute video" : "Mute video"}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        {/* Skip intro button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/20 text-white text-xs font-mono font-medium tracking-wider transition-all cursor-pointer shadow-lg"
        >
          Skip intro →
        </button>
      </div>

      {/* Cinematic Video Element */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <video
          ref={videoRef}
          src="/han-intro.mp4"
          autoPlay
          playsInline
          muted={isMuted}
          preload="auto"
          onEnded={handleFinish}
          onError={handleFinish}
          className="w-full h-full max-w-4xl max-h-screen object-contain drop-shadow-2xl"
          style={{
            filter: "drop-shadow(0 0 40px rgba(255, 255, 255, 0.15))",
          }}
        />
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-mono tracking-widest uppercase text-neutral-500 pointer-events-none">
        Tap anywhere to enter
      </div>
    </div>
  );
};
