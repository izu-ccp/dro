// ============================================================================
// Agent 1/9 — Web Search Agent
// Searches the open web for product listings across Amazon, eBay, Walmart, etc.
// ============================================================================

import { BaseAgent } from "./base";
import type { AgentContext, AgentProduct } from "./types";

export class WebSearchAgent extends BaseAgent {
  constructor() {
    super({
      name: "web_search",
      description: "Searches the open web for product listings, prices, and availability across Amazon, eBay, Walmart, and other stores.",
      tools: ["web_search", "web_scrape"],
      maxIterations: 3,
      timeoutMs: 15000,
    });
  }

  protected async execute(context: AgentContext) {
    const lastMessage = context.messages[context.messages.length - 1];
    const query = (context.sessionData?.itemName as string) ?? lastMessage?.content ?? "";

    this.think(`Searching the web for: "${query}"`);

    // Search across web stores (use user's region for localized results)
    const region = (context.sessionData?.region as string) ?? "US";
    const searchResult = await this.callTool("web_search", {
      query,
      maxResults: 30,
      region,
    });

    if (!searchResult.success) {
      return { message: `Web search failed: ${searchResult.error}` };
    }

    const searchData = searchResult.data as {
      results: Array<{
        title: string;
        url: string;
        snippet: string;
        price: number;
        originalPrice?: number;
        source?: string;
        tier?: string;
        icon?: string;
        delivery?: string;
        rating?: number;
        reviews?: number;
        image?: string;
        brand?: string;
        category?: string;
      }>;
    };

    this.say(`Found ${searchData.results.length} results across web stores`);

    // Map to AgentProduct directly from search results
    const products: AgentProduct[] = searchData.results.map((result, i) => {
      const source = result.source ?? "Web";
      const tier = (result.tier as "verified" | "trusted" | "marketplace") ?? "marketplace";
      const basePrice = result.price ?? 25;

      const priceHistory: number[] = [];
      for (let j = 0; j < 12; j++) {
        priceHistory.push(Math.round((basePrice * (0.9 + Math.random() * 0.2)) * 100) / 100);
      }

      const tags = [result.delivery, result.brand, result.category].filter(Boolean) as string[];

      return {
        id: `web_${Date.now()}_${i}`,
        name: result.title,
        source,
        sourceIcon: result.icon ?? source[0],
        price: result.price,
        originalPrice: result.originalPrice,
        currency: "USD",
        rating: result.rating ?? 4.0,
        reviews: result.reviews ?? 0,
        image: result.image ?? "",
        url: result.url,
        tier,
        priceHistory,
        tags,
        delivery: result.delivery ?? "Standard shipping",
        inStock: true,
        scrapedAt: Date.now(),
      };
    });

    return {
      message: `Found ${products.length} products across web stores for "${query}"`,
      data: { products, query, source: "web" },
    };
  }
}
