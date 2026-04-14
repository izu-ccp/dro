// ============================================================================
// DRO Agent Framework — Core Types
// ============================================================================

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tool Types
// ---------------------------------------------------------------------------

export type ToolCategory =
  | "search"
  | "steam"
  | "marketplace"
  | "analysis"
  | "payment"
  | "purchase"
  | "tracking"
  | "dispute";

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  enum?: string[];
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
  executionTimeMs: number;
}

export interface ToolCallRecord {
  tool: string;
  input: Record<string, unknown>;
  output: ToolResult;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Agent Types
// ---------------------------------------------------------------------------

export type AgentStatus =
  | "idle"
  | "thinking"
  | "executing"
  | "waiting"
  | "done"
  | "error";

export interface AgentConfig {
  name: string;
  description: string;
  tools: string[];
  maxIterations: number;
  timeoutMs: number;
}

export interface AgentContext {
  conversationId: string;
  messages: Message[];
  userPreferences: UserPreferences;
  sessionData: Record<string, unknown>;
}

export interface UserPreferences {
  paymentMode: "fiat" | "crypto";
  currency: string;
  steamTradeUrl?: string;
  shippingAddress?: ShippingAddress;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface AgentResult {
  agentName: string;
  status: "success" | "error" | "partial";
  message: string;
  data?: unknown;
  toolCalls: ToolCallRecord[];
  streamEvents: StreamEvent[];
  delegateTo?: string; // orchestrator routing
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

export type StreamEventType =
  | "thinking"
  | "tool_start"
  | "tool_end"
  | "message"
  | "status"
  | "products"
  | "order_update"
  | "error";

export interface StreamEvent {
  type: StreamEventType;
  agent: string;
  data: unknown;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Domain Objects — Products
// ---------------------------------------------------------------------------

export interface AgentProduct {
  id: string;
  name: string;
  source: string;
  sourceIcon: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating: number;
  reviews: number;
  image: string;
  url: string;
  tier: "verified" | "trusted" | "marketplace";
  priceHistory: number[];
  tags: string[];
  delivery: string;
  float?: number;
  wear?: string;
  inStock: boolean;
  scrapedAt: number;
}

// ---------------------------------------------------------------------------
// Domain Objects — Orders
// ---------------------------------------------------------------------------

export interface AgentOrder {
  orderId: string;
  status: string;
  item: string;
  source: string;
  price: number;
  escrowAddress?: string;
  trackingId?: string;
  timeline: AgentTimelineEvent[];
  estimatedDelivery?: string;
}

export interface AgentTimelineEvent {
  label: string;
  time: string;
  status: "done" | "active" | "pending";
  detail?: string;
  agentAction?: string;
}

// ---------------------------------------------------------------------------
// Domain Objects — Escrow
// ---------------------------------------------------------------------------

export type EscrowStatus =
  | "created"
  | "funded"
  | "released"
  | "disputed"
  | "refunded";

export interface EscrowContract {
  address: string;
  buyer: string;
  seller: string;
  amount: number;
  currency: string;
  status: EscrowStatus;
  createdAt: number;
  expiresAt: number;
  transactionHash?: string;
}

// ---------------------------------------------------------------------------
// Domain Objects — Payment
// ---------------------------------------------------------------------------

export type PaymentMethod = "card" | "bank" | "crypto";
export type PaymentStatus = "completed" | "pending" | "failed";

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  escrow?: EscrowContract;
}

// ---------------------------------------------------------------------------
// Domain Objects — Dispute
// ---------------------------------------------------------------------------

export type DisputeStatus =
  | "opened"
  | "under_review"
  | "resolved"
  | "escalated";

export interface DisputeResult {
  disputeId: string;
  orderId: string;
  status: DisputeStatus;
  reason: string;
  resolution?: string;
  refundAmount?: number;
  openedAt: number;
}

// ---------------------------------------------------------------------------
// API Request / Response
// ---------------------------------------------------------------------------

export interface ChatRequest {
  message: string;
  conversationId?: string;
  context?: {
    page?: string;
    productId?: string;
    orderId?: string;
  };
  preferences?: Partial<UserPreferences>;
}

export interface ChatResponse {
  conversationId: string;
  message: string;
  agent: string;
  data?: unknown;
  events: StreamEvent[];
}

export interface SearchRequest {
  query: string;
  sources?: string[];
  maxResults?: number;
  sortBy?: "price_asc" | "price_desc" | "rating" | "relevance";
  filters?: {
    minPrice?: number;
    maxPrice?: number;
    tier?: ("verified" | "trusted" | "marketplace")[];
    inStock?: boolean;
  };
}

export interface SearchResponse {
  query: string;
  results: AgentProduct[];
  totalSources: number;
  searchTimeMs: number;
  events: StreamEvent[];
}

export interface PurchaseRequest {
  productId: string;
  source: string;
  price?: number;
  itemName?: string;
  paymentMethod: PaymentMethod;
  deliveryInfo: {
    type: "steam_trade" | "shipping";
    steamTradeUrl?: string;
    address?: ShippingAddress;
  };
  cardInfo?: {
    number: string;
    expiry: string;
    cvv: string;
  };
  walletAddress?: string;
}

export interface PurchaseResponse {
  orderId: string;
  status: string;
  payment: PaymentResult;
  escrow: EscrowContract;
  timeline: AgentTimelineEvent[];
  events: StreamEvent[];
}

export interface TrackRequest {
  orderId: string;
}

export interface TrackResponse {
  order: AgentOrder;
  events: StreamEvent[];
}

export interface DisputeRequest {
  orderId: string;
  reason: string;
  evidence?: string;
}

export interface DisputeResponse {
  dispute: DisputeResult;
  events: StreamEvent[];
}
