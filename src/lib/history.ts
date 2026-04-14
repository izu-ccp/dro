// ============================================================================
// Transaction history — persisted in localStorage
// ============================================================================

export interface HistoryEntry {
  id: string;
  type: "purchase" | "pledge";
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  paymentMethod: "crypto" | "fiat";
  walletAddress?: string;
  txHashes?: Record<string, string>;
  campaignId?: string;
  productId?: string;
  source?: string;
  image?: string;
  timestamp: number;
}

const STORAGE_KEY = "dro_history";

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "purchase-20260407-a1",
    type: "purchase",
    title: "AWP | Asiimov (Field-Tested)",
    subtitle: "Steam Community Market · Trade offer sent",
    amount: 28.00,
    currency: "USDC",
    paymentMethod: "crypto",
    walletAddress: "0x87d7eD4285FE9512d2dC9e0B4B993D377eB0d155",
    txHashes: { escrow: "0x8f2a...d931", approve: "0x3b1c...e742", fund: "0x6d9e...f103" },
    source: "Steam",
    image: "https://community.fastly.steamstatic.com/economy/image/-9a81dlWLwJ2UXncezAc_0STOb-IIvEDjGMzMX-HtDuP0d2y5LdFoNjahsLYRT9WjYqfURqV0v8mMeBSSEVfRuG_ycqAQ2d7IThFibakOQZu1MzEdQJG49C5q4yKlPDnMbmDk2kGu5dy3-icoY6j0VKx/360fx360f",
    timestamp: Date.now() - 1 * 86400000,
  },
  {
    id: "purchase-20260406-b2",
    type: "purchase",
    title: "Nike Dunk Low Panda",
    subtitle: "Amazon · In transit — Louisville, KY",
    amount: 115.00,
    currency: "USD",
    paymentMethod: "fiat",
    txHashes: { payment: "pi_3xR8kL2eZvKYlo2C" },
    source: "Amazon",
    image: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/af53d53d-561f-450a-a483-70a7ceee380f/dunk-low-retro-mens-shoes-76KnBL.png",
    timestamp: Date.now() - 2 * 86400000,
  },
  {
    id: "pledge-20260406-c3",
    type: "pledge",
    title: "DRO Marketplace Launch Campaign",
    subtitle: "Oak Network · 0.05 ETH pledged",
    amount: 0.05,
    currency: "ETH",
    paymentMethod: "crypto",
    walletAddress: "0x87d7eD4285FE9512d2dC9e0B4B993D377eB0d155",
    campaignId: "dro-marketplace-launch",
    timestamp: Date.now() - 2.5 * 86400000,
  },
  {
    id: "purchase-20260405-d4",
    type: "purchase",
    title: "Logitech MX Master 3S",
    subtitle: "Amazon · Delivered Apr 6",
    amount: 89.99,
    currency: "USD",
    paymentMethod: "fiat",
    txHashes: { payment: "pi_3xQ7jK1dYvJXnm1B" },
    source: "Amazon",
    image: "https://resource.logitechg.com/w_692,c_lpad,ar_4:3,q_auto,f_auto,dpr_1.0/d_transparent.gif/content/dam/gaming/en/non-702702702702702702702702702702702702/702702702702702702702702702702702702702702/mx-master-3s.png",
    timestamp: Date.now() - 9 * 86400000,
  },
  {
    id: "purchase-20260403-e5",
    type: "purchase",
    title: "CS2 Sport Gloves | Vice",
    subtitle: "Steam Community Market · Delivered via trade",
    amount: 245.00,
    currency: "USDC",
    paymentMethod: "crypto",
    walletAddress: "0x87d7eD4285FE9512d2dC9e0B4B993D377eB0d155",
    txHashes: { escrow: "0x4a7b...c218", approve: "0x9f3d...a821", fund: "0x1e5c...b934" },
    source: "Steam",
    timestamp: Date.now() - 11 * 86400000,
  },
  {
    id: "pledge-20260402-f6",
    type: "pledge",
    title: "Oak Network Creator Fund",
    subtitle: "Oak Network · 0.1 ETH pledged",
    amount: 0.10,
    currency: "ETH",
    paymentMethod: "crypto",
    walletAddress: "0x87d7eD4285FE9512d2dC9e0B4B993D377eB0d155",
    campaignId: "oak-creator-fund",
    timestamp: Date.now() - 12 * 86400000,
  },
  {
    id: "purchase-20260401-g7",
    type: "purchase",
    title: "Steam Gift Card $50",
    subtitle: "G2A · Key delivered instantly",
    amount: 47.50,
    currency: "USD",
    paymentMethod: "fiat",
    txHashes: { payment: "pi_3xO5hI0cXvHWlk0A" },
    source: "G2A",
    timestamp: Date.now() - 13 * 86400000,
  },
  {
    id: "purchase-20260328-h8",
    type: "purchase",
    title: "Razer DeathAdder V3",
    subtitle: "Amazon · Delivered Mar 30",
    amount: 69.99,
    currency: "USD",
    paymentMethod: "fiat",
    txHashes: { payment: "pi_3xM3fG9bWvFUjk9Z" },
    source: "Amazon",
    timestamp: Date.now() - 17 * 86400000,
  },
  {
    id: "purchase-20260325-i9",
    type: "purchase",
    title: "Desert Eagle | Blaze (Factory New)",
    subtitle: "Steam Community Market · Delivered via trade",
    amount: 310.00,
    currency: "USDC",
    paymentMethod: "crypto",
    walletAddress: "0x87d7eD4285FE9512d2dC9e0B4B993D377eB0d155",
    txHashes: { escrow: "0x7c2e...d415", approve: "0xab3f...e927", fund: "0x5d8a...c146" },
    source: "Steam",
    timestamp: Date.now() - 20 * 86400000,
  },
  {
    id: "pledge-20260320-j10",
    type: "pledge",
    title: "Celo DeFi Accelerator",
    subtitle: "Oak Network · 0.2 ETH pledged",
    amount: 0.20,
    currency: "ETH",
    paymentMethod: "crypto",
    walletAddress: "0x87d7eD4285FE9512d2dC9e0B4B993D377eB0d155",
    campaignId: "celo-defi-accelerator",
    timestamp: Date.now() - 25 * 86400000,
  },
];

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    if (stored.length > 0) return stored;
    return MOCK_HISTORY;
  } catch {
    return MOCK_HISTORY;
  }
}

export function addHistory(entry: Omit<HistoryEntry, "id" | "timestamp">): HistoryEntry {
  const full: HistoryEntry = {
    ...entry,
    id: `${entry.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };
  const list = getHistory();
  list.unshift(full);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 200)));
  } catch {}
  return full;
}

export function getPledgedCampaignIds(walletAddress?: string | null): Set<string> {
  return new Set(
    getHistory()
      .filter((e) => {
        if (e.type !== "pledge" || !e.campaignId) return false;
        // If wallet address provided, only match entries for that wallet
        if (walletAddress) {
          return e.walletAddress?.toLowerCase() === walletAddress.toLowerCase();
        }
        return true;
      })
      .map((e) => e.campaignId!),
  );
}
