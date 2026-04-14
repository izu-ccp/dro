// ============================================================================
// DRO × Google ADK — Tool Definitions
// Wraps existing tool execute functions as ADK FunctionTool instances
// ============================================================================

import { FunctionTool } from "@google/adk";
import { z } from "zod/v4";

// Import existing tool execute logic
import { webSearchTool as _webSearch } from "../tools/web-search";
import { webScrapeTool as _webScrape } from "../tools/web-scrape";
import { steamMarketSearchTool as _steamSearch } from "../tools/steam-market-search";
import { steamMarketListingTool as _steamListing } from "../tools/steam-market-listing";
import { steamPriceHistoryTool as _steamHistory } from "../tools/steam-price-history";
import { steamFloatCheckTool as _steamFloat } from "../tools/steam-float-check";
import { skinportSearchTool as _skinport } from "../tools/skinport-search";
import { buff163SearchTool as _buff163 } from "../tools/buff163-search";
import { g2aSearchTool as _g2a } from "../tools/g2a-search";
import { comparePricesTool as _compare } from "../tools/compare-prices";
import { calculateFeesTool as _fees } from "../tools/calculate-fees";
import { processFiatPaymentTool as _fiat } from "../tools/process-fiat-payment";
import { processCryptoPaymentTool as _crypto } from "../tools/process-crypto-payment";
import { createEscrowTool as _escrow } from "../tools/create-escrow";
import { executePurchaseTool as _purchase } from "../tools/execute-purchase";
import { trackOrderTool as _trackOrder } from "../tools/track-order";
import { trackShippingTool as _trackShipping } from "../tools/track-shipping";
import { initiateDisputeTool as _dispute } from "../tools/initiate-dispute";

// Helper: call an existing tool and return its data (unwrap ToolResult)
async function call(
  tool: { execute: (args: Record<string, unknown>) => Promise<{ success: boolean; data: unknown; error?: string }> },
  args: Record<string, unknown>,
): Promise<unknown> {
  const result = await tool.execute(args);
  if (!result.success) throw new Error(result.error ?? "Tool execution failed");
  return result.data;
}

// ---------------------------------------------------------------------------
// 1. Web Search
// ---------------------------------------------------------------------------
export const webSearch = new FunctionTool({
  name: "web_search",
  description: "Search for real products using Google Shopping via Serper.dev. Returns product listings with prices, ratings, images, and source stores.",
  parameters: z.object({
    query: z.string().describe("Product search query"),
    maxResults: z.number().optional().default(20).describe("Maximum number of results to return"),
    region: z.string().optional().default("US").describe("Region/country code for localized results"),
  }),
  execute: async (args) => call(_webSearch, args),
});

// ---------------------------------------------------------------------------
// 2. Web Scrape
// ---------------------------------------------------------------------------
export const webScrape = new FunctionTool({
  name: "web_scrape",
  description: "Scrape detailed product information from a specific URL including price, availability, images, and metadata.",
  parameters: z.object({
    url: z.string().describe("URL to scrape for product details"),
  }),
  execute: async (args) => call(_webScrape, args),
});

// ---------------------------------------------------------------------------
// 3. Steam Market Search
// ---------------------------------------------------------------------------
export const steamMarketSearch = new FunctionTool({
  name: "steam_market_search",
  description: "Search Steam Community Market for CS2 skins, game items, and collectibles. Returns listings with prices, float values, and wear conditions.",
  parameters: z.object({
    query: z.string().describe("Item name or search query"),
    appId: z.number().optional().default(730).describe("Steam App ID (730 = CS2)"),
    minPrice: z.number().optional().describe("Minimum price filter in USD"),
    maxPrice: z.number().optional().describe("Maximum price filter in USD"),
    sortBy: z.enum(["price_asc", "price_desc", "popular", "recent"]).optional().describe("Sort order"),
  }),
  execute: async (args) => call(_steamSearch, args),
});

// ---------------------------------------------------------------------------
// 4. Steam Market Listing
// ---------------------------------------------------------------------------
export const steamMarketListing = new FunctionTool({
  name: "steam_market_listing",
  description: "Get detailed information about a specific Steam market listing including inspect link, float value, stickers, and seller history.",
  parameters: z.object({
    listingId: z.string().describe("Steam market listing ID"),
    appId: z.number().optional().default(730).describe("Steam App ID"),
  }),
  execute: async (args) => call(_steamListing, args),
});

// ---------------------------------------------------------------------------
// 5. Steam Price History
// ---------------------------------------------------------------------------
export const steamPriceHistory = new FunctionTool({
  name: "steam_price_history",
  description: "Get price history for a Steam market item over a specified time period. Returns daily prices, volume, and trend statistics.",
  parameters: z.object({
    itemName: z.string().describe("Full item market hash name"),
    appId: z.number().optional().default(730).describe("Steam App ID"),
    days: z.number().optional().default(30).describe("Number of days of history"),
  }),
  execute: async (args) => call(_steamHistory, args),
});

// ---------------------------------------------------------------------------
// 6. Steam Float Check
// ---------------------------------------------------------------------------
export const steamFloatCheck = new FunctionTool({
  name: "steam_float_check",
  description: "Check the float value, paint seed, and pattern details of a CS2 skin. Returns wear condition, rarity, and ranking info.",
  parameters: z.object({
    inspectLink: z.string().describe("CS2 inspect link or listing ID"),
  }),
  execute: async (args) => call(_steamFloat, args),
});

// ---------------------------------------------------------------------------
// 7. Skinport Search
// ---------------------------------------------------------------------------
export const skinportSearch = new FunctionTool({
  name: "skinport_search",
  description: "Search Skinport marketplace for CS2 skins with instant delivery. Returns listings with float values, discounts, and seller ratings.",
  parameters: z.object({
    query: z.string().describe("Item search query"),
    minPrice: z.number().optional().describe("Minimum price in USD"),
    maxPrice: z.number().optional().describe("Maximum price in USD"),
    wear: z.enum(["FN", "MW", "FT", "WW", "BS"]).optional().describe("Wear condition filter"),
    sortBy: z.enum(["price", "discount", "date", "popular"]).optional().describe("Sort order"),
  }),
  execute: async (args) => call(_skinport, args),
});

// ---------------------------------------------------------------------------
// 8. Buff163 Search
// ---------------------------------------------------------------------------
export const buff163Search = new FunctionTool({
  name: "buff163_search",
  description: "Search Buff163 (buff.163.com) P2P marketplace for CS2 skins — typically the lowest prices. Returns CNY and USD prices.",
  parameters: z.object({
    query: z.string().describe("Item search query"),
    minPrice: z.number().optional().describe("Minimum price in CNY"),
    maxPrice: z.number().optional().describe("Maximum price in CNY"),
    sortBy: z.enum(["price", "created", "float"]).optional().describe("Sort order"),
  }),
  execute: async (args) => call(_buff163, args),
});

// ---------------------------------------------------------------------------
// 9. G2A Search
// ---------------------------------------------------------------------------
export const g2aSearch = new FunctionTool({
  name: "g2a_search",
  description: "Search G2A marketplace for game keys, gift cards, and digital items. Returns listings with seller ratings and delivery info.",
  parameters: z.object({
    query: z.string().describe("Item search query"),
    category: z.enum(["game_keys", "gift_cards", "skins", "software"]).optional().describe("Product category"),
    minPrice: z.number().optional().describe("Minimum price in USD"),
    maxPrice: z.number().optional().describe("Maximum price in USD"),
  }),
  execute: async (args) => call(_g2a, args),
});

// ---------------------------------------------------------------------------
// 10. Compare Prices
// ---------------------------------------------------------------------------
export const comparePrices = new FunctionTool({
  name: "compare_prices",
  description: "Compare prices for the same item across multiple sources. Ranks by price, calculates savings, and recommends the best deal.",
  parameters: z.object({
    itemName: z.string().describe("Item name to compare"),
    prices: z.array(z.object({
      source: z.string(),
      price: z.number(),
      currency: z.string().optional().default("USD"),
      tier: z.enum(["verified", "trusted", "marketplace"]),
      delivery: z.string(),
      float: z.number().optional(),
      url: z.string().optional(),
    })).describe("Array of price entries from different sources"),
    preferTier: z.enum(["verified", "trusted", "marketplace", "any"]).optional().default("any").describe("Preferred source tier"),
  }),
  execute: async (args) => call(_compare, args),
});

// ---------------------------------------------------------------------------
// 11. Calculate Fees
// ---------------------------------------------------------------------------
export const calculateFees = new FunctionTool({
  name: "calculate_fees",
  description: "Calculate protocol fees (1%), platform fees (1%), and payment processing fees for a purchase. Returns total cost breakdown.",
  parameters: z.object({
    itemPrice: z.number().describe("Base item price in USD"),
    source: z.string().describe("Source marketplace name"),
    paymentMethod: z.enum(["card", "bank", "crypto"]).describe("Payment method"),
    currency: z.string().optional().default("USD").describe("Currency code"),
  }),
  execute: async (args) => call(_fees, args),
});

// ---------------------------------------------------------------------------
// 12. Process Fiat Payment
// ---------------------------------------------------------------------------
export const processFiatPayment = new FunctionTool({
  name: "process_fiat_payment",
  description: "Process a fiat payment via Stripe (card or bank transfer). Returns transaction ID and receipt URL.",
  parameters: z.object({
    amount: z.number().describe("Amount to charge in USD"),
    currency: z.string().optional().default("USD").describe("Currency code"),
    method: z.enum(["card", "bank"]).describe("Fiat payment method"),
    cardLast4: z.string().optional().describe("Last 4 digits of card for display"),
    orderId: z.string().describe("Associated DRO order ID"),
  }),
  execute: async (args) => call(_fiat, args),
});

// ---------------------------------------------------------------------------
// 13. Process Crypto Payment
// ---------------------------------------------------------------------------
export const processCryptoPayment = new FunctionTool({
  name: "process_crypto_payment",
  description: "Prepare a crypto payment intent for on-chain execution. Returns approval and transfer data for the client wallet on Celo Sepolia.",
  parameters: z.object({
    amount: z.number().describe("Amount in USD equivalent"),
    token: z.enum(["USDC", "USDT"]).describe("Token to pay with"),
    walletAddress: z.string().describe("Sender wallet address"),
    orderId: z.string().describe("Associated DRO order ID"),
  }),
  execute: async (args) => call(_crypto, args),
});

// ---------------------------------------------------------------------------
// 14. Create Escrow
// ---------------------------------------------------------------------------
export const createEscrow = new FunctionTool({
  name: "create_escrow",
  description: "Create an on-chain escrow contract for a purchase. Locks buyer funds until delivery is confirmed. Auto-refunds after timeout.",
  parameters: z.object({
    buyerAddress: z.string().describe("Buyer wallet address"),
    sellerSource: z.string().describe("Seller marketplace source"),
    amount: z.number().describe("Escrow amount in USD"),
    orderId: z.string().describe("Associated DRO order ID"),
    token: z.enum(["USDC", "USDT"]).optional().default("USDC").describe("Payment token"),
    timeoutDays: z.number().optional().default(14).describe("Auto-refund timeout in days"),
  }),
  execute: async (args) => call(_escrow, args),
});

// ---------------------------------------------------------------------------
// 15. Execute Purchase
// ---------------------------------------------------------------------------
export const executePurchase = new FunctionTool({
  name: "execute_purchase",
  description: "Execute a proxy purchase on the source marketplace on behalf of the buyer. Handles Steam trades, shipping, and digital key delivery.",
  parameters: z.object({
    source: z.string().describe("Source marketplace (e.g. Steam, Amazon, Skinport)"),
    itemId: z.string().describe("Item ID on the source platform"),
    itemName: z.string().describe("Item name for records"),
    price: z.number().describe("Expected price in USD"),
    deliveryType: z.enum(["steam_trade", "shipping", "digital_key", "instant"]).describe("Delivery method"),
    deliveryTarget: z.string().describe("Steam trade URL or shipping address ID"),
    escrowAddress: z.string().describe("Escrow contract address"),
  }),
  execute: async (args) => call(_purchase, args),
});

// ---------------------------------------------------------------------------
// 16. Track Order
// ---------------------------------------------------------------------------
export const trackOrder = new FunctionTool({
  name: "track_order",
  description: "Get the current status and full timeline of a DRO order including escrow state and delivery progress.",
  parameters: z.object({
    orderId: z.string().describe("DRO order ID (e.g. PB-20260407-0042)"),
  }),
  execute: async (args) => call(_trackOrder, args),
});

// ---------------------------------------------------------------------------
// 17. Track Shipping
// ---------------------------------------------------------------------------
export const trackShipping = new FunctionTool({
  name: "track_shipping",
  description: "Track a physical shipment via carrier tracking number. Supports UPS, FedEx, USPS, and DHL.",
  parameters: z.object({
    trackingId: z.string().describe("Carrier tracking number"),
    carrier: z.enum(["UPS", "FedEx", "USPS", "DHL", "auto"]).optional().default("auto").describe("Shipping carrier or auto-detect"),
  }),
  execute: async (args) => call(_trackShipping, args),
});

// ---------------------------------------------------------------------------
// 18. Initiate Dispute
// ---------------------------------------------------------------------------
export const initiateDispute = new FunctionTool({
  name: "initiate_dispute",
  description: "Open a dispute on an order. Freezes escrow funds and initiates the dispute resolution process with auto-refund timeline.",
  parameters: z.object({
    orderId: z.string().describe("DRO order ID to dispute"),
    reason: z.enum(["not_received", "wrong_item", "damaged", "not_as_described", "other"]).describe("Dispute reason"),
    description: z.string().describe("Detailed description of the issue"),
    evidence: z.string().optional().describe("URLs or references to evidence (screenshots, etc.)"),
    requestedResolution: z.enum(["full_refund", "partial_refund", "replacement", "other"]).optional().default("full_refund").describe("Desired resolution"),
  }),
  execute: async (args) => call(_dispute, args),
});

// ---------------------------------------------------------------------------
// Tool Groups (for assigning to agents)
// ---------------------------------------------------------------------------

export const searchTools = [webSearch, webScrape];
export const steamTools = [steamMarketSearch, steamMarketListing, steamPriceHistory, steamFloatCheck];
export const marketplaceTools = [skinportSearch, buff163Search, g2aSearch];
export const analysisTools = [comparePrices, calculateFees];
export const paymentTools = [calculateFees, processFiatPayment, processCryptoPayment, createEscrow];
export const purchaseTools = [executePurchase];
export const trackingTools = [trackOrder, trackShipping];
export const disputeTools = [initiateDispute, trackOrder];
