// ============================================================================
// DRO Agent Framework — Public API
// ============================================================================

export * from "./types";
export { BaseAgent } from "./base";
export { agentRegistry } from "./registry";

// Agents
export { OrchestratorAgent } from "./orchestrator";
export { WebSearchAgent } from "./web-search";
export { SteamAgent } from "./steam";
export { DigitalMarketplaceAgent } from "./digital-marketplace";
export { PriceComparisonAgent } from "./price-comparison";
export { PaymentAgent } from "./payment";
export { PurchaseAgent } from "./purchase";
export { OrderTrackingAgent } from "./order-tracking";
export { DisputeRefundAgent } from "./dispute-refund";

// Singleton orchestrator instance
import { OrchestratorAgent } from "./orchestrator";
import { initializeTools } from "../tools";

let _orchestrator: OrchestratorAgent | null = null;

export function getOrchestrator(): OrchestratorAgent {
  if (!_orchestrator) {
    initializeTools();
    _orchestrator = new OrchestratorAgent();
  }
  return _orchestrator;
}
