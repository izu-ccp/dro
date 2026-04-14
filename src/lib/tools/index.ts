// ============================================================================
// DRO Tool Framework — Register All 18 Tools
// ============================================================================

import { toolRegistry } from "./registry";

// Search tools (1-2)
import { webSearchTool } from "./web-search";
import { webScrapeTool } from "./web-scrape";

// Steam tools (3-6)
import { steamMarketSearchTool } from "./steam-market-search";
import { steamMarketListingTool } from "./steam-market-listing";
import { steamPriceHistoryTool } from "./steam-price-history";
import { steamFloatCheckTool } from "./steam-float-check";

// Marketplace tools (7-9)
import { skinportSearchTool } from "./skinport-search";
import { buff163SearchTool } from "./buff163-search";
import { g2aSearchTool } from "./g2a-search";

// Analysis tools (10-11)
import { comparePricesTool } from "./compare-prices";
import { calculateFeesTool } from "./calculate-fees";

// Payment tools (12-14)
import { processFiatPaymentTool } from "./process-fiat-payment";
import { processCryptoPaymentTool } from "./process-crypto-payment";
import { createEscrowTool } from "./create-escrow";

// Purchase tools (15)
import { executePurchaseTool } from "./execute-purchase";

// Tracking tools (16-17)
import { trackOrderTool } from "./track-order";
import { trackShippingTool } from "./track-shipping";

// Dispute tools (18)
import { initiateDisputeTool } from "./initiate-dispute";

// Register all tools
const allTools = [
  webSearchTool,
  webScrapeTool,
  steamMarketSearchTool,
  steamMarketListingTool,
  steamPriceHistoryTool,
  steamFloatCheckTool,
  skinportSearchTool,
  buff163SearchTool,
  g2aSearchTool,
  comparePricesTool,
  calculateFeesTool,
  processFiatPaymentTool,
  processCryptoPaymentTool,
  createEscrowTool,
  executePurchaseTool,
  trackOrderTool,
  trackShippingTool,
  initiateDisputeTool,
];

let initialized = false;

export function initializeTools(): void {
  if (initialized) return;
  for (const tool of allTools) {
    toolRegistry.register(tool);
  }
  initialized = true;
}

// Re-export
export { toolRegistry } from "./registry";

export {
  webSearchTool,
  webScrapeTool,
  steamMarketSearchTool,
  steamMarketListingTool,
  steamPriceHistoryTool,
  steamFloatCheckTool,
  skinportSearchTool,
  buff163SearchTool,
  g2aSearchTool,
  comparePricesTool,
  calculateFeesTool,
  processFiatPaymentTool,
  processCryptoPaymentTool,
  createEscrowTool,
  executePurchaseTool,
  trackOrderTool,
  trackShippingTool,
  initiateDisputeTool,
};
