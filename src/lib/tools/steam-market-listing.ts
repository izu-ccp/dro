// Tool 4/18 — Steam Market Listing Details
import type { ToolDefinition, ToolResult } from "../agents/types";

export const steamMarketListingTool: ToolDefinition = {
  name: "steam_market_listing",
  description: "Get detailed information about a specific Steam market listing including inspect link, float, stickers, and seller history",
  category: "steam",
  parameters: [
    { name: "listingId", type: "string", description: "Steam market listing ID", required: true },
    { name: "appId", type: "number", description: "Steam App ID", default: 730 },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const listingId = args.listingId as string;

    await new Promise((r) => setTimeout(r, 60 + Math.random() * 100));

    const listings: Record<string, object> = {
      stm_001: {
        listingId: "stm_001",
        name: "AK-47 | Redline (Field-Tested)",
        price: 27.45,
        currency: "USD",
        float: 0.2134,
        paintSeed: 312,
        wear: "Field-Tested",
        rarity: "Classified",
        collection: "The Phoenix Collection",
        stickers: [],
        inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview...",
        nameTag: null,
        tradable: true,
        marketable: true,
        seller: { name: "cs2trader_42", rating: 4.8, totalSales: 342 },
        image: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_ak47_cu_ak47_redline_light_large.png",
      },
      stm_002: {
        listingId: "stm_002",
        name: "AK-47 | Redline (Field-Tested)",
        price: 28.10,
        currency: "USD",
        float: 0.1823,
        paintSeed: 891,
        wear: "Field-Tested",
        rarity: "Classified",
        collection: "The Phoenix Collection",
        stickers: [{ name: "Natus Vincere | Katowice 2019", position: 0 }],
        inspectLink: "steam://rungame/730/76561202255233023/+csgo_econ_action_preview...",
        nameTag: null,
        tradable: true,
        marketable: true,
        seller: { name: "skindeals_pro", rating: 4.9, totalSales: 1205 },
        image: "https://steamcdn-a.akamaihd.net/apps/730/icons/econ/default_generated/weapon_ak47_cu_ak47_redline_light_large.png",
      },
    };

    const listing = listings[listingId];

    if (!listing) {
      return {
        success: false,
        data: null,
        error: `Listing "${listingId}" not found`,
        executionTimeMs: Date.now() - start,
      };
    }

    return {
      success: true,
      data: listing,
      executionTimeMs: Date.now() - start,
    };
  },
};
