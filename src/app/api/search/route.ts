// ============================================================================
// POST /api/search — Product search via Google ADK
// ============================================================================

import { NextResponse } from "next/server";
import type { SearchRequest, SearchResponse, AgentProduct } from "@/lib/agents/types";
import { runAgent, extractProducts } from "@/lib/adk";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchRequest & { region?: string };
    const { query, maxResults, sortBy, filters } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const headers = Object.fromEntries(new Headers(request.headers));
    const region = (
      body.region ||
      headers["x-vercel-ip-country"] ||
      headers["cf-ipcountry"] ||
      headers["x-country-code"] ||
      "us"
    ).toLowerCase();

    const startTime = Date.now();

    // Run through ADK agent system
    const result = await runAgent(query, {
      sessionData: { itemName: query, region },
    });

    // Extract products from tool results and session state
    const rawProducts = extractProducts(result);

    // Map to AgentProduct format
    let products: AgentProduct[] = rawProducts.map((p: unknown, i: number) => {
      const item = p as Record<string, unknown>;
      const price = (item.price as number) ?? 0;

      // Generate price history if not present
      let priceHistory = item.priceHistory as number[] | undefined;
      if (!priceHistory || !Array.isArray(priceHistory) || priceHistory.length === 0) {
        priceHistory = [];
        for (let j = 0; j < 12; j++) {
          priceHistory.push(Math.round((price * (0.9 + Math.random() * 0.2)) * 100) / 100);
        }
      }

      return {
        id: (item.id as string) ?? (item.listingId as string) ?? `r_${i}`,
        name: (item.name as string) ?? (item.title as string) ?? "Unknown",
        source: (item.source as string) ?? "Web",
        sourceIcon: (item.sourceIcon as string) ?? (item.icon as string) ?? ((item.source as string) ?? "?")[0],
        price,
        originalPrice: (item.originalPrice as number) ?? (item.suggestedPrice as number) ?? undefined,
        currency: (item.currency as string) ?? "USD",
        rating: Math.round(((item.rating as number) ?? 3.5 + Math.random() * 1.5) * 10) / 10,
        reviews: (item.reviews as number) ?? (item.ratingCount as number) ?? Math.floor(100 + Math.random() * 5000),
        image: (item.image as string) ?? (item.imageUrl as string) ?? "",
        url: (item.url as string) ?? (item.link as string) ?? "",
        tier: (item.tier as AgentProduct["tier"]) ?? "marketplace",
        priceHistory,
        tags: (item.tags as string[]) ?? [],
        delivery: (item.delivery as string) ?? "Standard",
        float: item.float as number | undefined,
        wear: item.wear as string | undefined,
        inStock: (item.inStock as boolean) ?? true,
        scrapedAt: (item.scrapedAt as number) ?? Date.now(),
      };
    });

    // Apply filters
    if (filters) {
      if (filters.minPrice != null) products = products.filter((p) => p.price >= filters.minPrice!);
      if (filters.maxPrice != null) products = products.filter((p) => p.price <= filters.maxPrice!);
      if (filters.tier?.length) products = products.filter((p) => filters.tier!.includes(p.tier));
      if (filters.inStock != null) products = products.filter((p) => p.inStock === filters.inStock);
    }

    if (sortBy) {
      switch (sortBy) {
        case "price_asc": products.sort((a, b) => a.price - b.price); break;
        case "price_desc": products.sort((a, b) => b.price - a.price); break;
        case "rating": products.sort((a, b) => b.rating - a.rating); break;
      }
    }

    if (maxResults) products = products.slice(0, maxResults);

    const response: SearchResponse & { aiSummary?: string } = {
      query,
      results: products,
      totalSources: new Set(products.map((p) => p.source)).size,
      searchTimeMs: Date.now() - startTime,
      events: [],
    };

    // Include AI summary from agent response
    if (result.response && result.response.length > 30) {
      (response as unknown as Record<string, unknown>).aiSummary = result.response;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
