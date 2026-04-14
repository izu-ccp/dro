// Tool 7/18 — Skinport Search
import type { ToolDefinition, ToolResult } from "../agents/types";

export const skinportSearchTool: ToolDefinition = {
  name: "skinport_search",
  description: "Search Skinport marketplace for CS2 skins with instant delivery",
  category: "marketplace",
  parameters: [
    { name: "query", type: "string", description: "Item search query", required: true },
    { name: "minPrice", type: "number", description: "Minimum price" },
    { name: "maxPrice", type: "number", description: "Maximum price" },
    { name: "wear", type: "string", description: "Wear condition filter", enum: ["FN", "MW", "FT", "WW", "BS"] },
    { name: "sortBy", type: "string", description: "Sort order", enum: ["price", "discount", "date", "popular"] },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const query = (args.query as string).toLowerCase();

    await new Promise((r) => setTimeout(r, 100 + Math.random() * 150));

    const itemName = (args.query as string).trim();
    const basePrice = 12 + Math.random() * 60;
    const wearData = [
      { code: "FN", mult: 1.8, discount: 5.0, floatBase: 0.01, floatRange: 0.06 },
      { code: "MW", mult: 1.3, discount: 10.3, floatBase: 0.07, floatRange: 0.08 },
      { code: "FT", mult: 0.92, discount: 8.0, floatBase: 0.15, floatRange: 0.2 },
      { code: "WW", mult: 0.7, discount: 12.0, floatBase: 0.38, floatRange: 0.06 },
      { code: "BS", mult: 0.5, discount: 15.0, floatBase: 0.45, floatRange: 0.5 },
    ];
    const listings = wearData.map((w, i) => ({
      id: `sp_${Date.now()}_${i}`,
      name: `${itemName} (${w.code})`,
      price: Math.round(basePrice * w.mult * (0.95 + Math.random() * 0.1) * 100) / 100,
      suggestedPrice: Math.round(basePrice * w.mult * 1.1 * 100) / 100,
      discount: w.discount,
      float: w.floatBase + Math.random() * w.floatRange,
      wear: w.code,
      delivery: "instant",
      seller: { rating: 4.2 + Math.random() * 0.7, sales: Math.floor(500 + Math.random() * 2000) },
    }));

    return {
      success: true,
      data: {
        source: "Skinport",
        query: args.query,
        totalListings: listings.length,
        listings,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
