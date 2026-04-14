// Tool 3/18 — Steam Market Search
import type { ToolDefinition, ToolResult } from "../agents/types";

export const steamMarketSearchTool: ToolDefinition = {
  name: "steam_market_search",
  description: "Search Steam Community Market for game items, skins, and collectibles",
  category: "steam",
  parameters: [
    { name: "query", type: "string", description: "Item name or search query", required: true },
    { name: "appId", type: "number", description: "Steam App ID (730 = CS2)", default: 730 },
    { name: "minPrice", type: "number", description: "Minimum price filter" },
    { name: "maxPrice", type: "number", description: "Maximum price filter" },
    { name: "sortBy", type: "string", description: "Sort order", enum: ["price_asc", "price_desc", "popular", "recent"] },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const query = (args.query as string).toLowerCase();

    await new Promise((r) => setTimeout(r, 100 + Math.random() * 150));

    const itemName = (args.query as string).trim();
    const isGameSearch = /\b(game|games|video\s*game|rpg|fps|indie|dlc|early\s*access)\b/i.test(query);

    let listings;

    if (isGameSearch) {
      // Return actual game titles from Steam
      const steamGames = [
        { name: "Elden Ring", price: 59.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg" },
        { name: "Cyberpunk 2077", price: 29.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg" },
        { name: "Baldur's Gate 3", price: 59.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg" },
        { name: "Red Dead Redemption 2", price: 39.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg" },
        { name: "Grand Theft Auto V", price: 19.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg" },
        { name: "The Witcher 3: Wild Hunt", price: 39.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg" },
        { name: "Counter-Strike 2", price: 0, img: "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg" },
        { name: "DOOM Eternal", price: 39.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/782330/header.jpg" },
        { name: "Hades II", price: 29.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/1145350/header.jpg" },
        { name: "Hollow Knight", price: 14.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/367520/header.jpg" },
        { name: "Stardew Valley", price: 14.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg" },
        { name: "Terraria", price: 9.99, img: "https://cdn.akamai.steamstatic.com/steam/apps/105600/header.jpg" },
      ];

      // Filter by query keywords if specific
      const keywords = query.split(/\s+/).filter((w) => w.length > 2 && !["game", "games", "video", "find", "the", "best", "cheap", "cheapest"].includes(w));
      const filtered = keywords.length > 0
        ? steamGames.filter((g) => keywords.some((k) => g.name.toLowerCase().includes(k)))
        : steamGames;
      const results = filtered.length > 0 ? filtered : steamGames;

      listings = results.map((g, i) => ({
        listingId: `stm_game_${Date.now()}_${i}`,
        name: g.name,
        price: g.price,
        image: g.img,
        type: "game" as const,
        float: undefined as number | undefined,
        wear: undefined as string | undefined,
        stickers: [] as string[],
        tradable: true,
        listingAge: `${Math.floor(Math.random() * 48)}h`,
      }));
    } else {
      // Skin/item search — generate more listings per wear condition
      const basePrice = 15 + Math.random() * 80;
      const wears = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
      const stickerSets = [[], ["Natus Vincere | Katowice 2019"], ["FaZe Clan | Antwerp 2022"], ["s1mple | Paris 2023", "G2 | Rio 2022"], []];
      listings = wears.flatMap((wear, wi) => {
        const count = wi <= 2 ? 2 : 1; // More listings for popular wears
        return Array.from({ length: count }, (_, j) => {
          const multiplier = [2.2, 1.4, 1.0, 0.75, 0.5][wi];
          const variance = 0.9 + Math.random() * 0.2;
          return {
            listingId: `stm_${Date.now()}_${wi}_${j}`,
            name: `${itemName} (${wear})`,
            price: Math.round(basePrice * multiplier * variance * 100) / 100,
            float: [0.01 + Math.random() * 0.06, 0.07 + Math.random() * 0.08, 0.15 + Math.random() * 0.2, 0.38 + Math.random() * 0.06, 0.45 + Math.random() * 0.5][wi],
            wear,
            stickers: stickerSets[(wi + j) % stickerSets.length] as string[],
            tradable: true,
            listingAge: `${Math.floor(1 + Math.random() * 48)}h`,
            image: undefined as string | undefined,
            type: "skin" as const,
          };
        });
      });
    }

    return {
      success: true,
      data: {
        query: args.query,
        appId: args.appId ?? 730,
        totalListings: listings.length,
        listings,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
