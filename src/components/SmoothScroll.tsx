"use client";

import { useEffect, useRef, useCallback } from "react";
import Lenis from "lenis";

interface SmoothScrollProps {
  children: React.ReactNode;
  onScrollProgress?: (progress: number) => void;
}

export default function SmoothScroll({
  children,
  onScrollProgress,
}: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);

  const raf = useCallback(
    (time: number) => {
      lenisRef.current?.raf(time);
      requestAnimationFrame(raf);
    },
    []
  );

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenisRef.current = lenis;

    lenis.on("scroll", (e: { progress: number }) => {
      onScrollProgress?.(e.progress);
    });

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, [raf, onScrollProgress]);

  return <>{children}</>;
}
