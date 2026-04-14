"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet/context";

export default function Navbar() {
  const { connected, shortAddress, tokens, openModal } = useWallet();

  // Find CELO balance from tokens
  const celoToken = tokens.find((t) => t.symbol === "CELO");
  const celoBalance = celoToken ? parseFloat(celoToken.balance) : 0;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 2.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-20 flex items-center justify-between relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 pointer-events-auto">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan/30 to-neon-cyan/10 border border-neon-cyan/25 flex items-center justify-center">
            <Zap className="w-4 h-4 text-accent-bright" />
          </div>
          <span className="text-[15px] font-sans font-semibold tracking-[-0.02em] text-white">
            DRO
          </span>
        </Link>

        {/* Right nav */}
        <div className="flex items-center gap-3 pointer-events-auto">
          <Link
            href="/dashboard"
            className="hidden sm:block px-4 py-2 text-[13px] font-mono tracking-wide text-white/60 hover:text-white transition-colors duration-300"
          >
            Dashboard
          </Link>
          <Link
            href="/tracking"
            className="hidden sm:block px-4 py-2 text-[13px] font-mono tracking-wide text-white/60 hover:text-white transition-colors duration-300"
          >
            Orders
          </Link>
          <Link
            href="/history"
            className="hidden sm:block px-4 py-2 text-[13px] font-mono tracking-wide text-white/60 hover:text-white transition-colors duration-300"
          >
            History
          </Link>

          {/* Connect Wallet Button */}
          <button
            onClick={openModal}
            className={`flex items-center gap-2 py-2.5 px-5 rounded-xl text-[13px] font-mono transition-all duration-300 ${
              connected
                ? "bg-[#FCFF52]/5 border border-[#FCFF52]/20 text-[#FCFF52] hover:bg-[#FCFF52]/10"
                : "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-accent/25 text-accent hover:border-accent/40 hover:shadow-[0_0_30px_rgba(206,202,251,0.15)]"
            }`}
          >
            {connected ? (
              <>
                <img src="/tokens/celo.svg" alt="Celo" className="w-5 h-5" />
                <span>{shortAddress}</span>
                {celoBalance > 0 && (
                  <span className="text-[11px] text-white/40 ml-1">
                    {celoBalance.toFixed(2)} CELO
                  </span>
                )}
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </>
            )}
          </button>
        </div>
      </div>
    </motion.nav>
  );
}
