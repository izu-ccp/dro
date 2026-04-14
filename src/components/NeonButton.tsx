"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";

interface NeonButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}

export default function NeonButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  className,
  disabled = false,
  type = "button",
}: NeonButtonProps) {
  const variants = {
    primary:
      "bg-gradient-to-r from-neon-cyan/20 to-neon-blue/20 border-neon-cyan/40 text-neon-cyan hover:from-neon-cyan/30 hover:to-neon-blue/30 hover:border-neon-cyan/60 hover:shadow-[0_0_30px_rgba(0,240,255,0.2)]",
    secondary:
      "bg-gradient-to-r from-neon-purple/20 to-neon-pink/20 border-neon-purple/40 text-neon-purple hover:from-neon-purple/30 hover:to-neon-pink/30 hover:border-neon-purple/60 hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]",
    danger:
      "bg-gradient-to-r from-danger/20 to-warning/20 border-danger/40 text-danger hover:from-danger/30 hover:to-warning/30 hover:border-danger/60",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "relative rounded-xl border font-semibold transition-all duration-300",
        "backdrop-blur-sm",
        variants[variant],
        sizes[size],
        disabled && "opacity-40 cursor-not-allowed",
        className
      )}
    >
      {children}
    </motion.button>
  );
}
