"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ScrollReveal from "./ScrollReveal";

interface Stat {
  label: string;
  value: string;
  suffix?: string;
}

const stats: Stat[] = [
  { label: "Total Volume", value: "$2.4M", suffix: "" },
  { label: "Orders Fulfilled", value: "1,240", suffix: "+" },
  { label: "Active Buyers", value: "340", suffix: "" },
  { label: "Avg. Savings", value: "14", suffix: "%" },
];

export default function LiveStats() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
      {stats.map((stat, i) => (
        <ScrollReveal key={stat.label} delay={0.15 * i}>
          <div className="text-center md:text-left">
            <p className="label-text mb-3">{stat.label}</p>
            <p className="heading-section !text-[clamp(32px,4dvw,64px)] accent-value text-glow">
              {stat.value}
              {stat.suffix && (
                <span className="text-[0.6em] opacity-50">{stat.suffix}</span>
              )}
            </p>
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
