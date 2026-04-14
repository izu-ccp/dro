import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CursorWrapper from "@/components/CursorWrapper";
import WalletModal from "@/components/WalletModal";
import CookieBanner from "@/components/CookieBanner";
import { WalletProvider } from "@/lib/wallet/context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DRO — AI-Powered Universal Proxy Marketplace",
  description:
    "Shop anything from anywhere. AI agents find, compare, and buy products for you with escrow protection.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body suppressHydrationWarning>
        <WalletProvider>
          <CursorWrapper />
          {children}
          <WalletModal />
          <CookieBanner />
        </WalletProvider>
      </body>
    </html>
  );
}
