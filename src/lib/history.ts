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

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
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
