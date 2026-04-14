"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 400);
          return 100;
        }
        const remaining = 100 - prev;
        return prev + Math.max(1, remaining * 0.08);
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.59, 0.25, 0.12, 1] }}
          className="fixed inset-0 z-[99999] bg-[#0a0812] flex flex-col items-center justify-center"
        >
          {/* Logo */}
          <div className="relative w-32 h-32 mb-8">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <pattern id="dots" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                  <circle cx="4" cy="4" r="1.2" fill="white" />
                </pattern>
                <clipPath id="revealClip">
                  <circle cx="100" cy="100" r="80">
                    <animate
                      attributeName="r"
                      from="0"
                      to="90"
                      dur="2.5s"
                      begin="0s"
                      fill="freeze"
                      calcMode="spline"
                      keySplines="0.59 0.25 0.12 1"
                      keyTimes="0;1"
                    />
                  </circle>
                </clipPath>
              </defs>

              <circle cx="100" cy="100" r="70" fill="none" stroke="rgba(196,181,253,0.15)" strokeWidth="0.5" />

              <g clipPath="url(#revealClip)">
                <rect width="200" height="200" fill="url(#dots)" opacity="0.6">
                  <animateTransform
                    attributeName="transform"
                    type="scale"
                    values="1;1.03;1"
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </rect>
              </g>

              <text
                x="100"
                y="108"
                textAnchor="middle"
                fill="#7ECFD6"
                fontFamily="var(--font-sans), system-ui"
                fontSize="28"
                fontWeight="600"
                letterSpacing="-0.03em"
              >
                DRO
              </text>
            </svg>
          </div>

          {/* Progress bar — thicker and more visible */}
          <div className="w-48 h-[2px] bg-white/10 rounded-full relative overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-[#7ECFD6] rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>

          {/* Progress number — much more visible */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            className="mt-5 text-[13px] font-mono tracking-[0.2em] text-[#7ECFD6]/70"
          >
            {Math.round(progress)}%
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
