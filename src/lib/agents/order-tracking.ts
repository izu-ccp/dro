// ============================================================================
// Agent 7/9 — Order Tracking Agent
// Tracks orders and shipments in real time
// ============================================================================

import { BaseAgent } from "./base";
import type { AgentContext, AgentOrder } from "./types";

export class OrderTrackingAgent extends BaseAgent {
  constructor() {
    super({
      name: "order_tracking",
      description: "Tracks DRO orders and physical shipments. Provides real-time status, timeline events, and delivery estimates.",
      tools: ["track_order", "track_shipping"],
      maxIterations: 3,
      timeoutMs: 15000,
    });
  }

  protected async execute(context: AgentContext) {
    const sd = context.sessionData ?? {};
    const orderId = sd.orderId as string;

    if (!orderId) {
      return { message: "No order ID provided for tracking." };
    }

    this.think(`Tracking order: ${orderId}`);

    // Step 1: Get order status
    const orderResult = await this.callTool("track_order", { orderId });

    if (!orderResult.success) {
      return {
        message: `Order not found: ${orderResult.error}`,
        data: { status: "not_found", orderId },
      };
    }

    const order = orderResult.data as AgentOrder & {
      trackingId?: string;
      escrow?: { address: string; status: string; amount: number; expiresAt: number };
    };

    this.say(`Order ${orderId}: ${order.status}`);

    // Step 2: If there's a shipping tracking ID, get carrier details
    let shippingData = null;
    if (order.trackingId) {
      this.think(`Checking carrier tracking: ${order.trackingId}`);
      const shippingResult = await this.callTool("track_shipping", {
        trackingId: order.trackingId,
        carrier: "auto",
      });

      if (shippingResult.success) {
        shippingData = shippingResult.data;
      }
    }

    // Build comprehensive tracking response
    const trackingResponse: AgentOrder & { shipping?: unknown; escrow?: unknown } = {
      orderId: order.orderId,
      status: order.status,
      item: order.item,
      source: order.source,
      price: order.price,
      escrowAddress: order.escrow?.address,
      trackingId: order.trackingId,
      timeline: order.timeline,
      estimatedDelivery: shippingData
        ? (shippingData as { estimatedDelivery: string }).estimatedDelivery
        : undefined,
    };

    if (shippingData) {
      trackingResponse.shipping = shippingData;
    }

    if (order.escrow) {
      trackingResponse.escrow = order.escrow;
    }

    const activeStep = order.timeline.find(
      (t: { status: string }) => t.status === "active",
    );

    return {
      message: `Order ${orderId}: ${order.status}${activeStep ? ` — ${(activeStep as { label: string }).label}` : ""}`,
      data: trackingResponse,
    };
  }
}
