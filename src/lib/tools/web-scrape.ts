// Tool 2/18 — Web Scrape
import type { ToolDefinition, ToolResult } from "../agents/types";

export const webScrapeTool: ToolDefinition = {
  name: "web_scrape",
  description: "Scrape detailed product information from a specific URL including price, availability, images, and metadata",
  category: "search",
  parameters: [
    { name: "url", type: "string", description: "URL to scrape", required: true },
    { name: "selectors", type: "object", description: "CSS selectors for data extraction" },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const url = args.url as string;

    await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));

    const isSteam = url.includes("steam");
    const isSkinport = url.includes("skinport");
    const isAmazon = url.includes("amazon");

    const mockData = isSteam
      ? {
          title: "AK-47 | Redline (Field-Tested)",
          price: 27.45,
          currency: "USD",
          seller: "Steam Community Market",
          inStock: true,
          images: ["/products/ak47-redline.jpg"],
          attributes: { float: 0.21, wear: "Field-Tested", rarity: "Classified" },
        }
      : isSkinport
        ? {
            title: "AK-47 | Redline (Field-Tested)",
            price: 25.90,
            currency: "USD",
            seller: "Skinport",
            inStock: true,
            images: ["/products/ak47-redline-3.jpg"],
            attributes: { float: 0.23, wear: "Field-Tested", delivery: "Instant" },
          }
        : isAmazon
          ? {
              title: "Logitech MX Master 3S",
              price: 89.99,
              currency: "USD",
              seller: "Amazon",
              inStock: true,
              images: ["/products/mx-master.jpg"],
              attributes: { shipping: "2-day", prime: true },
            }
          : {
              title: "Product",
              price: 0,
              currency: "USD",
              seller: "Unknown",
              inStock: false,
              images: [],
              attributes: {},
            };

    return {
      success: true,
      data: { url, ...mockData, scrapedAt: Date.now() },
      executionTimeMs: Date.now() - start,
    };
  },
};
