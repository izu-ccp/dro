"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FeedItem {
  id: number;
  text: string;
  value: string;
}

const feedData: FeedItem[] = [
  { id: 1, text: "Orders fulfilled in last hour", value: "12" },
  { id: 2, text: "Settled through protocol today", value: "$45,200" },
  { id: 3, text: "Active searches right now", value: "340" },
  { id: 4, text: "Items in escrow", value: "28" },
  { id: 5, text: "Average savings per order", value: "14%" },
];

export default function LiveFeed() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % feedData.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="glass px-6 py-4 flex items-center gap-3 min-h-[56px]">
      <div className="relative flex-shrink-0">
        <span className="block w-2 h-2 rounded-full bg-neon-green pulse-dot" />
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={feedData[current].id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 text-sm"
        >
          <span className="text-foreground/60">{feedData[current].text}</span>
          <span className="font-mono font-bold text-neon-cyan text-glow-cyan">
            {feedData[current].value}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
