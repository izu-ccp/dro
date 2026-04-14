// Tool 5/18 — Steam Price History
import type { ToolDefinition, ToolResult } from "../agents/types";

function generatePriceHistory(basePrice: number, days: number): Array<{ date: string; price: number; volume: number }> {
  const history = [];
  const now = Date.now();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now - i * 86400000);
    const variance = (Math.random() - 0.5) * basePrice * 0.15;
    history.push({
      date: date.toISOString().split("T")[0],
      price: Math.round((basePrice + variance) * 100) / 100,
      volume: Math.floor(50 + Math.random() * 200),
    });
  }
  return history;
}

export const steamPriceHistoryTool: ToolDefinition = {
  name: "steam_price_history",
  description: "Get price history for a Steam market item over a specified time period",
  category: "steam",
  parameters: [
    { name: "itemName", type: "string", description: "Full item market hash name", required: true },
    { name: "appId", type: "number", description: "Steam App ID", default: 730 },
    { name: "days", type: "number", description: "Number of days of history", default: 30 },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const itemName = (args.itemName as string).toLowerCase();
    const days = (args.days as number) ?? 30;

    await new Promise((r) => setTimeout(r, 80 + Math.random() * 100));

    let basePrice = 25;
    if (itemName.includes("asiimov")) basePrice = 34;
    else if (itemName.includes("neo-noir") || itemName.includes("neonoir")) basePrice = 19;
    else if (itemName.includes("redline")) basePrice = 27;

    const history = generatePriceHistory(basePrice, days);
    const prices = history.map((h) => h.price);

    return {
      success: true,
      data: {
        itemName: args.itemName,
        appId: args.appId ?? 730,
        period: `${days}d`,
        history,
        stats: {
          current: prices[prices.length - 1],
          min: Math.min(...prices),
          max: Math.max(...prices),
          avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
          trend: prices[prices.length - 1] > prices[0] ? "up" : "down",
          changePercent: Math.round(((prices[prices.length - 1] - prices[0]) / prices[0]) * 10000) / 100,
        },
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
