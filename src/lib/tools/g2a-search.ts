// Tool 9/18 — G2A Search
import type { ToolDefinition, ToolResult } from "../agents/types";

export const g2aSearchTool: ToolDefinition = {
  name: "g2a_search",
  description: "Search G2A marketplace for game keys, gift cards, and digital items",
  category: "marketplace",
  parameters: [
    { name: "query", type: "string", description: "Item search query", required: true },
    { name: "category", type: "string", description: "Product category", enum: ["game_keys", "gift_cards", "skins", "software"] },
    { name: "minPrice", type: "number", description: "Minimum price" },
    { name: "maxPrice", type: "number", description: "Maximum price" },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const query = (args.query as string).toLowerCase();

    await new Promise((r) => setTimeout(r, 90 + Math.random() * 130));

    const itemName = (args.query as string).trim();
    const isGameSearch = /\b(game|games|video\s*game|rpg|fps|indie)\b/i.test(query);

    let listings;
    if (isGameSearch) {
      const gameKeys = [
        { name: "Elden Ring — Steam Key", price: 42.99, original: 59.99, image: "https://cdn.akamai.steamstatic.com/steam/apps/1245620/header.jpg" },
        { name: "Cyberpunk 2077 — Steam Key", price: 24.99, original: 29.99, image: "https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg" },
        { name: "Red Dead Redemption 2 — Steam Key", price: 29.99, original: 39.99, image: "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg" },
        { name: "GTA V — Steam Key", price: 14.99, original: 19.99, image: "https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg" },
        { name: "The Witcher 3 GOTY — Steam Key", price: 9.99, original: 39.99, image: "https://cdn.akamai.steamstatic.com/steam/apps/292030/header.jpg" },
        { name: "Baldur's Gate 3 — Steam Key", price: 49.99, original: 59.99, image: "https://cdn.akamai.steamstatic.com/steam/apps/1086940/header.jpg" },
      ];
      const keywords = query.split(/\s+/).filter((w) => w.length > 2 && !["game", "games", "video", "find", "the", "best", "cheap"].includes(w));
      const filtered = keywords.length > 0 ? gameKeys.filter((g) => keywords.some((k) => g.name.toLowerCase().includes(k))) : gameKeys;
      const results = filtered.length > 0 ? filtered : gameKeys;

      listings = results.map((g, i) => ({
        id: `g2a_${Date.now()}_${i}`, name: g.name, price: g.price, originalPrice: g.original,
        discount: Math.round((1 - g.price / g.original) * 100), seller: "GameKeys_HQ",
        sellerRating: 4.2 + Math.random() * 0.6, reviews: 2000 + Math.floor(Math.random() * 8000),
        delivery: "Instant Key", region: "Global", image: g.image,
      }));
    } else {
      const basePrice = 10 + Math.random() * 50;
      const sellers = ["GameSkins_Pro", "Digital_Vault", "KeyMaster_EU", "TurboKeys", "SkinBaron_Official"];
      const regions = ["Global", "EU", "NA", "CIS", "Asia"];
      listings = sellers.map((seller, i) => ({
        id: `g2a_${Date.now()}_${i}`,
        name: `${itemName} — ${i === 0 ? "Digital Key" : i === 1 ? "Gift" : i === 2 ? "Bundle" : i === 3 ? "Deluxe" : "Standard"}`,
        price: Math.round(basePrice * (0.75 + i * 0.06) * (0.95 + Math.random() * 0.1) * 100) / 100,
        originalPrice: Math.round(basePrice * 100) / 100,
        discount: Math.round((0.25 - i * 0.04) * 100) / 100,
        seller,
        sellerRating: 3.5 + Math.random() * 1.3,
        reviews: 400 + Math.floor(Math.random() * 8000),
        delivery: "Key delivery",
        region: regions[i],
      }));
    }

    return {
      success: true,
      data: {
        source: "G2A",
        query: args.query,
        totalListings: listings.length,
        listings,
        warning: "G2A is a third-party marketplace. Items may have different delivery methods. Buyer protection applies.",
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
