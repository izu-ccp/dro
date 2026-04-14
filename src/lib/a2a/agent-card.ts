// ============================================================================
// A2A Agent Cards — Each agent advertises its capabilities
// ============================================================================

import type { AgentCard } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export const agentCards: Record<string, AgentCard> = {
  orchestrator: {
    name: "DRO Orchestrator",
    description: "Routes user requests to specialist agents. Manages multi-agent workflows for search, purchase, tracking, and disputes.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
    defaultInputModes: ["text", "data"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "route", name: "Intent Routing", description: "Classifies user intent and delegates to the right agent", tags: ["routing", "orchestration"], examples: ["Search for a laptop", "Track my order"] },
      { id: "workflow", name: "Multi-Agent Workflow", description: "Coordinates sequential agent workflows like search→compare→buy", tags: ["workflow", "pipeline"] },
    ],
  },

  web_search: {
    name: "DRO Web Search Agent",
    description: "Searches the web for products across Amazon, eBay, Walmart, Target, and other retailers.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "product_search", name: "Product Search", description: "Search for products by name, category, or description", tags: ["search", "products", "shopping"], examples: ["laptop", "Nike shoes", "iPhone 15"] },
    ],
  },

  steam: {
    name: "DRO Steam Agent",
    description: "Searches Steam Community Market for CS2 skins, game items, and collectibles. Checks float values and price history.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "steam_search", name: "Steam Market Search", description: "Search Steam Community Market for game items", tags: ["steam", "cs2", "skins", "gaming"], examples: ["AK-47 Redline", "AWP Asiimov"] },
      { id: "float_check", name: "Float Check", description: "Check CS2 skin float value and wear", tags: ["cs2", "float", "inspect"] },
      { id: "price_history", name: "Price History", description: "Get Steam market price history for an item", tags: ["steam", "prices", "history"] },
    ],
  },

  digital_marketplace: {
    name: "DRO Digital Marketplace Agent",
    description: "Aggregates listings from Skinport, Buff163, and G2A for competitive prices on game items.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: true, pushNotifications: false, stateTransitionHistory: true },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "marketplace_search", name: "Marketplace Search", description: "Search Skinport, Buff163, G2A in parallel", tags: ["skinport", "buff163", "g2a", "marketplace"] },
    ],
  },

  price_comparison: {
    name: "DRO Price Comparison Agent",
    description: "Compares prices across all sources and recommends the best deal with fee calculation.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: true },
    defaultInputModes: ["data"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "compare", name: "Price Compare", description: "Compare prices across multiple sources", tags: ["compare", "prices", "deals"] },
      { id: "fees", name: "Fee Calculator", description: "Calculate total cost including protocol and platform fees", tags: ["fees", "cost"] },
    ],
  },

  payment: {
    name: "DRO Payment Agent",
    description: "Processes fiat and crypto payments on Celo. Deploys escrow smart contracts.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: true, pushNotifications: true, stateTransitionHistory: true },
    defaultInputModes: ["data"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "fiat_pay", name: "Fiat Payment", description: "Process card/bank payments via Stripe", tags: ["payment", "fiat", "stripe"] },
      { id: "crypto_pay", name: "Crypto Payment", description: "Process USDC/USDT payments on Celo", tags: ["payment", "crypto", "celo", "usdc", "usdt"] },
      { id: "escrow", name: "Escrow", description: "Deploy and manage escrow smart contracts", tags: ["escrow", "smart-contract", "celo"] },
    ],
  },

  purchase: {
    name: "DRO Purchase Agent",
    description: "Executes proxy purchases on source marketplaces on behalf of the buyer.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: true, pushNotifications: true, stateTransitionHistory: true },
    defaultInputModes: ["data"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "buy", name: "Execute Purchase", description: "Buy an item from the source marketplace", tags: ["purchase", "buy", "order"] },
    ],
  },

  order_tracking: {
    name: "DRO Order Tracking Agent",
    description: "Tracks orders and shipments in real time with timeline updates.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: true, pushNotifications: true, stateTransitionHistory: true },
    defaultInputModes: ["text", "data"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "track_order", name: "Track Order", description: "Get order status and timeline", tags: ["tracking", "order", "status"] },
      { id: "track_shipping", name: "Track Shipping", description: "Track carrier shipment", tags: ["tracking", "shipping", "delivery"] },
    ],
  },

  dispute_refund: {
    name: "DRO Dispute & Refund Agent",
    description: "Opens disputes, freezes escrow, and manages the refund resolution process.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: false, pushNotifications: true, stateTransitionHistory: true },
    defaultInputModes: ["text", "data"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "dispute", name: "Open Dispute", description: "Open a dispute on an order and freeze escrow", tags: ["dispute", "refund", "escrow"] },
    ],
  },
  health_monitor: {
    name: "DRO Health Monitor Agent",
    description: "Monitors the entire user journey end-to-end. Runs automated health checks on all endpoints, detects failures, and suggests code fixes.",
    url: `${BASE_URL}/api/a2a`,
    version: "1.0.0",
    protocolVersion: "0.2",
    capabilities: { streaming: false, pushNotifications: true, stateTransitionHistory: true },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text", "data"],
    skills: [
      { id: "health_check", name: "Health Check", description: "Run full E2E health checks across all endpoints and user flows", tags: ["health", "monitoring", "e2e", "testing"] },
      { id: "diagnose", name: "Diagnose Issues", description: "Identify root cause of failures and suggest code fixes", tags: ["debug", "fix", "diagnose"] },
    ],
  },
};

export function getAgentCard(agentId: string): AgentCard | undefined {
  return agentCards[agentId];
}

export function getAllAgentCards(): AgentCard[] {
  return Object.values(agentCards);
}
