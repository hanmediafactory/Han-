import React, { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight } from "lucide-react";

interface IntroVideoSplashProps {
  onComplete: () => void;
}

export const IntroVideoSplash: React.FC<IntroVideoSplashProps> = ({ onComplete }) => {
  const [fading, setFading] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [prefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);

  const handleFinish = useCallback(() => {
    // Guard against multiple rapid taps triggering duplicate transitions
    if (completedRef.current) return;
    completedRef.current = true;

    setFading(true);
    setTimeout(() => {
      onComplete();
    }, 450);
  }, [onComplete]);

  // Headless test runner detection (0 artificial delay in E2E tests)
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (
      navigator.webdriver ||
      window.location.search.includes("skip-intro") ||
      window.location.search.includes("e2e")
    ) {
      onComplete();
    }
  }, [onComplete]);

  // Safety fallback timer: ensure user is never trapped even if video stalls or fails
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 6000);

    return () => clearTimeout(safetyTimer);
  }, [handleFinish]);

  // Keyboard shortcut listener: Escape, Enter, or Spacebar skips immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFinish]);

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
      role="region"
      aria-label="Welcome to HAN Media Factory"
      className={`fixed inset-0 z-[99999] bg-[#000000] text-white flex flex-col justify-between select-none overflow-hidden transition-opacity duration-500 ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        paddingTop: "max(16px, env(safe-area-inset-top, 16px))",
        paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
        paddingLeft: "max(20px, env(safe-area-inset-left, 20px))",
        paddingRight: "max(20px, env(safe-area-inset-right, 20px))",
        background: "radial-gradient(ellipse at 50% 45%, #0A0A0A 0%, #000000 100%)",
      }}
      onClick={handleFinish}
    >
      {/* ── Top Bar: Safe-area aligned brand mark & accessible Skip control ── */}
      <header className="w-full flex items-center justify-between z-20 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900/80 border border-neutral-800 text-neutral-300">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="font-mono text-[11px] font-semibold tracking-[0.22em] uppercase text-neutral-200">
            HAN MEDIA FACTORY
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          aria-label="Skip intro animation"
          className="min-h-[44px] min-w-[44px] px-4 py-2 rounded-full bg-neutral-900/90 hover:bg-neutral-800 active:scale-95 text-neutral-300 hover:text-white border border-neutral-700/80 text-xs font-mono font-medium tracking-wider transition-all cursor-pointer shadow-lg flex items-center justify-center"
        >
          Skip Intro →
        </button>
      </header>

      {/* ── Center Stage: Hero composition with seamless video / titanium logo ── */}
      <main className="relative flex-1 flex flex-col items-center justify-center w-full px-4 my-auto pointer-events-auto">
        <div className="relative w-full max-w-md flex flex-col items-center justify-center">
          {/* Ambient titanium glow behind logo/video */}
          <div
            className="absolute -inset-10 opacity-30 pointer-events-none rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Cinematic MP4 video with crisp titanium logo base */}
          {!videoFailed && !prefersReducedMotion ? (
            <div className="relative w-full aspect-video flex items-center justify-center">
              {/* Sharp titanium logo base for immediate high-contrast clarity */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img
                  src="/logo-clean.png"
                  alt="HAN Media Factory"
                  className={`w-4/5 max-w-[320px] h-auto object-contain transition-all duration-700 ${
                    videoEnded
                      ? "opacity-100 scale-100 drop-shadow-[0_10px_35px_rgba(255,255,255,0.3)]"
                      : "opacity-50 scale-98"
                  }`}
                />
              </div>

              {/* Dynamic video overlay blending motion smoothly over the logo */}
              <video
                ref={videoRef}
                src="/han-intro.mp4"
                autoPlay
                playsInline
                muted
                preload="auto"
                onEnded={() => setVideoEnded(true)}
                onError={() => {
                  setVideoFailed(true);
                  setVideoEnded(true);
                }}
                className={`w-full h-full object-contain pointer-events-none transition-opacity duration-700 ${
                  videoEnded ? "opacity-0" : "opacity-100"
                }`}
                style={{
                  mixBlendMode: "screen",
                }}
              />
            </div>
          ) : (
            <div className="w-full flex items-center justify-center py-6 animate-fadeIn">
              <img
                src="/logo-clean.png"
                alt="HAN Media Factory"
                className="w-4/5 max-w-[340px] h-auto object-contain drop-shadow-[0_10px_35px_rgba(255,255,255,0.3)]"
              />
            </div>
          )}

          {/* Restrained Titanium Typography matching Screen 1 */}
          <div className="text-center space-y-1 mt-8">
            <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-neutral-300">
              BUILD TRUST.
            </p>
            <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-neutral-300">
              GROW BRANDS.
            </p>
            <p className="text-xs font-mono font-bold tracking-[0.3em] uppercase text-neutral-300">
              CREATE IMPACT.
            </p>
          </div>
        </div>
      </main>

      {/* ── Bottom Entry Action: TAP TO ENTER → ── */}
      <footer className="w-full max-w-sm mx-auto flex flex-col items-center gap-3 z-20 pointer-events-auto pb-4">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleFinish();
          }}
          className="text-xs font-mono font-bold tracking-[0.25em] text-neutral-400 hover:text-white uppercase transition-colors flex items-center gap-2 cursor-pointer py-3 px-6 rounded-full hover:bg-neutral-900/60 active:scale-95"
        >
          <span>TAP TO ENTER</span>
          <ArrowRight size={14} />
        </button>
      </footer>
    </div>
  );
};
