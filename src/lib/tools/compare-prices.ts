// Tool 10/18 — Compare Prices
import type { ToolDefinition, ToolResult } from "../agents/types";

interface PriceEntry {
  source: string;
  price: number;
  currency: string;
  tier: "verified" | "trusted" | "marketplace";
  delivery: string;
  float?: number;
  url?: string;
}

export const comparePricesTool: ToolDefinition = {
  name: "compare_prices",
  description: "Compare prices for the same item across multiple sources, calculating savings and recommending the best option",
  category: "analysis",
  parameters: [
    { name: "itemName", type: "string", description: "Item to compare", required: true },
    { name: "prices", type: "array", description: "Array of price entries from different sources", required: true },
    { name: "preferTier", type: "string", description: "Preferred source tier", enum: ["verified", "trusted", "marketplace", "any"] },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const prices = args.prices as PriceEntry[];
    const preferTier = (args.preferTier as string) ?? "any";

    if (!prices || prices.length === 0) {
      return { success: false, data: null, error: "No prices to compare", executionTimeMs: Date.now() - start };
    }

    const sorted = [...prices].sort((a, b) => a.price - b.price);
    const cheapest = sorted[0];
    const mostExpensive = sorted[sorted.length - 1];
    const avgPrice = Math.round((prices.reduce((s, p) => s + p.price, 0) / prices.length) * 100) / 100;

    const tierFiltered = preferTier !== "any" ? sorted.filter((p) => p.tier === preferTier) : sorted;
    const recommended = tierFiltered.length > 0 ? tierFiltered[0] : cheapest;

    const comparison = sorted.map((p, i) => ({
      rank: i + 1,
      source: p.source,
      price: p.price,
      tier: p.tier,
      delivery: p.delivery,
      savingsVsMax: Math.round((mostExpensive.price - p.price) * 100) / 100,
      savingsPercent: Math.round(((mostExpensive.price - p.price) / mostExpensive.price) * 10000) / 100,
      float: p.float,
    }));

    return {
      success: true,
      data: {
        itemName: args.itemName,
        comparison,
        summary: {
          cheapest: { source: cheapest.source, price: cheapest.price },
          mostExpensive: { source: mostExpensive.source, price: mostExpensive.price },
          averagePrice: avgPrice,
          priceSpread: Math.round((mostExpensive.price - cheapest.price) * 100) / 100,
          spreadPercent: Math.round(((mostExpensive.price - cheapest.price) / cheapest.price) * 10000) / 100,
          totalSources: prices.length,
        },
        recommended: {
          source: recommended.source,
          price: recommended.price,
          tier: recommended.tier,
          reason: preferTier !== "any"
            ? `Best price in ${preferTier} tier`
            : "Lowest overall price",
        },
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
