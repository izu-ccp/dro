"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const dotX = useSpring(cursorX, { damping: 25, stiffness: 300 });
  const dotY = useSpring(cursorY, { damping: 25, stiffness: 300 });
  const ringX = useSpring(cursorX, { damping: 18, stiffness: 150 });
  const ringY = useSpring(cursorY, { damping: 18, stiffness: 150 });
  const isHovering = useRef(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const over = () => {
      isHovering.current = true;
      if (ringRef.current) {
        ringRef.current.style.width = "48px";
        ringRef.current.style.height = "48px";
        ringRef.current.style.borderColor = "rgba(126, 207, 214, 0.5)";
      }
      if (dotRef.current) {
        dotRef.current.style.opacity = "0.3";
      }
    };

    const out = () => {
      isHovering.current = false;
      if (ringRef.current) {
        ringRef.current.style.width = "32px";
        ringRef.current.style.height = "32px";
        ringRef.current.style.borderColor = "rgba(126, 207, 214, 0.25)";
      }
      if (dotRef.current) {
        dotRef.current.style.opacity = "1";
      }
    };

    window.addEventListener("mousemove", move);

    // Track interactive elements
    const interactives = document.querySelectorAll(
      "a, button, input, [role='button'], [data-cursor='hover']"
    );
    interactives.forEach((el) => {
      el.addEventListener("mouseenter", over);
      el.addEventListener("mouseleave", out);
    });

    // Hide default cursor
    document.body.style.cursor = "none";

    return () => {
      window.removeEventListener("mousemove", move);
      interactives.forEach((el) => {
        el.removeEventListener("mouseenter", over);
        el.removeEventListener("mouseleave", out);
      });
      document.body.style.cursor = "";
    };
  }, [cursorX, cursorY]);

  return (
    <>
      {/* Dot */}
      <motion.div
        ref={dotRef}
        className="fixed top-0 left-0 z-[100000] pointer-events-none mix-blend-difference"
        style={{
          x: dotX,
          y: dotY,
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: "#7ECFD6",
          translateX: "-50%",
          translateY: "-50%",
          transition: "opacity 0.2s ease",
        }}
      />
      {/* Ring */}
      <motion.div
        ref={ringRef}
        className="fixed top-0 left-0 z-[100000] pointer-events-none"
        style={{
          x: ringX,
          y: ringY,
          width: 32,
          height: 32,
          borderRadius: "50%",
          border: "1.5px solid rgba(126, 207, 214, 0.25)",
          translateX: "-50%",
          translateY: "-50%",
          transition: "width 0.25s ease, height 0.25s ease, border-color 0.25s ease",
        }}
      />
    </>
  );
}
