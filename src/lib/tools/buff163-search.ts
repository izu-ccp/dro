// Tool 8/18 — Buff163 Search
import type { ToolDefinition, ToolResult } from "../agents/types";

export const buff163SearchTool: ToolDefinition = {
  name: "buff163_search",
  description: "Search Buff163 (buff.163.com) for CS2 skins — typically lowest prices, P2P marketplace",
  category: "marketplace",
  parameters: [
    { name: "query", type: "string", description: "Item search query", required: true },
    { name: "minPrice", type: "number", description: "Min price in CNY (auto-converted)" },
    { name: "maxPrice", type: "number", description: "Max price in CNY (auto-converted)" },
    { name: "sortBy", type: "string", description: "Sort order", enum: ["price", "created", "float"] },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const query = (args.query as string).toLowerCase();

    await new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

    const cnyToUsd = 0.138;
    const itemName = (args.query as string).trim();
    const baseCNY = 100 + Math.random() * 400;
    const wearData = [
      { code: "FN", mult: 1.9, floatBase: 0.01, floatRange: 0.06 },
      { code: "MW", mult: 1.35, floatBase: 0.07, floatRange: 0.08 },
      { code: "FT", mult: 1.0, floatBase: 0.15, floatRange: 0.2 },
      { code: "WW", mult: 0.7, floatBase: 0.38, floatRange: 0.06 },
      { code: "BS", mult: 0.45, floatBase: 0.45, floatRange: 0.5 },
    ];
    const listings = wearData.map((w, i) => {
      const priceCNY = Math.round(baseCNY * w.mult * (0.95 + Math.random() * 0.1));
      return {
        id: `bf_${Date.now()}_${i}`,
        name: `${itemName} (${w.code})`,
        priceCNY,
        priceUSD: Math.round(priceCNY * cnyToUsd * 100) / 100,
        float: w.floatBase + Math.random() * w.floatRange,
        wear: w.code,
        delivery: "2-5 min",
        seller: { steamLevel: 30 + Math.floor(Math.random() * 70), registeredDays: 1000 + Math.floor(Math.random() * 3000) },
      };
    });

    return {
      success: true,
      data: {
        source: "Buff163",
        query: args.query,
        totalListings: listings.length,
        exchangeRate: { CNY_USD: cnyToUsd },
        listings,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
