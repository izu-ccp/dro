"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "cyan" | "purple" | "blue" | "none";
  onClick?: () => void;
}

export default function GlassCard({
  children,
  className,
  hover = true,
  glow = "none",
  onClick,
}: GlassCardProps) {
  const glowClass = {
    cyan: "glow-cyan",
    purple: "glow-purple",
    blue: "glow-blue",
    none: "",
  }[glow];

  return (
    <motion.div
      whileHover={hover ? { scale: 1.01, y: -2 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      className={clsx(
        "glass p-6 transition-all duration-300",
        hover && "hover:bg-glass-hover cursor-pointer",
        glowClass,
        className
      )}
    >
      {children}
    </motion.div>
  );
}
