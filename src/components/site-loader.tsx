"use client";

import { useEffect, useState } from "react";

export function SiteLoader() {
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Keep loader visible briefly so user sees the branded splash, then gracefully fade out
    const handleComplete = () => {
      setFading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 400); // 400ms fade transition
      return () => clearTimeout(timer);
    };

    if (document.readyState === "complete") {
      const timer = setTimeout(handleComplete, 350);
      return () => clearTimeout(timer);
    } else {
      window.addEventListener("load", handleComplete);
      // Fallback timeout in case window.load takes too long
      const fallbackTimer = setTimeout(handleComplete, 1200);
      return () => {
        window.removeEventListener("load", handleComplete);
        clearTimeout(fallbackTimer);
      };
    }
  }, []);

  if (!loading) return null;

  return (
    <div
      role="status"
      aria-label="Loading GDG on Campus VCET"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-400 ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6 px-6 text-center animate-pulse">
        {/* Official GDG on Campus VCET Logo Badge */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/gdg-vcet-logo.png"
          alt="Google Developer Groups on Campus · VCET"
          width={517}
          height={66}
          className="h-9 sm:h-11 w-auto max-w-[280px] sm:max-w-[360px] object-contain drop-shadow-xs"
        />

        {/* 4-Color Google Brand Loading Bar */}
        <div className="w-48 sm:w-56 h-1 rounded-full bg-slate-100 overflow-hidden relative shadow-inner">
          <div className="absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] rounded-full animate-loader-slide"></div>
        </div>
      </div>
    </div>
  );
}
