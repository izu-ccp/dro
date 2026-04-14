// Tool 16/18 — Track Order
import type { ToolDefinition, ToolResult } from "../agents/types";

export const trackOrderTool: ToolDefinition = {
  name: "track_order",
  description: "Get the current status and full timeline of a DRO order including escrow state and delivery progress",
  category: "tracking",
  parameters: [
    { name: "orderId", type: "string", description: "DRO order ID", required: true },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const orderId = args.orderId as string;

    await new Promise((r) => setTimeout(r, 60 + Math.random() * 80));

    // Simulate order lookup from DB
    const mockOrders: Record<string, object> = {
      "PB-20260407-0042": {
        orderId: "PB-20260407-0042",
        item: "AK-47 | Redline (FT)",
        source: "Steam",
        price: 28.00,
        status: "trade_sent",
        escrow: {
          address: "0x7a3b...f29d",
          status: "funded",
          amount: 28.28,
          expiresAt: Date.now() + 12 * 86400000,
        },
        timeline: [
          { label: "Payment Received", time: "4:32 PM", status: "done", detail: "Tx: 0x8f2a...d931" },
          { label: "Escrow Created", time: "4:32 PM", status: "done", detail: "Contract: 0x7a3b...f29d" },
          { label: "Purchasing from Steam", time: "4:33 PM", status: "done" },
          { label: "Trade Offer Sent", time: "4:35 PM", status: "active", detail: "Waiting for you to accept" },
          { label: "Delivery Confirmed", time: "", status: "pending" },
          { label: "Escrow Released", time: "", status: "pending" },
        ],
        createdAt: "2026-04-07T16:32:00Z",
      },
      "PB-20260406-0041": {
        orderId: "PB-20260406-0041",
        item: "Nike Dunk Low Panda",
        source: "Amazon",
        price: 115.00,
        status: "in_transit",
        trackingId: "1Z999AA10123456784",
        escrow: {
          address: "0x4c1e...a82b",
          status: "funded",
          amount: 117.30,
          expiresAt: Date.now() + 11 * 86400000,
        },
        timeline: [
          { label: "Payment Received", time: "2:15 PM", status: "done", detail: "Stripe: pi_3x...k9" },
          { label: "Escrow Created", time: "2:15 PM", status: "done", detail: "Contract: 0x4c1e...a82b" },
          { label: "Order Placed on Amazon", time: "2:18 PM", status: "done", detail: "Order: 114-2849531-7739482" },
          { label: "Shipped", time: "Apr 6, 6:45 PM", status: "done", detail: "UPS: 1Z999AA10123456784" },
          { label: "In Transit", time: "Apr 7, 10:22 AM", status: "active", detail: "Louisville, KY" },
          { label: "Delivery Confirmed", time: "", status: "pending" },
          { label: "Escrow Released", time: "", status: "pending" },
        ],
        createdAt: "2026-04-06T14:15:00Z",
      },
    };

    const order = mockOrders[orderId];
    if (!order) {
      return {
        success: false,
        data: null,
        error: `Order "${orderId}" not found`,
        executionTimeMs: Date.now() - start,
      };
    }

    return {
      success: true,
      data: order,
      executionTimeMs: Date.now() - start,
    };
  },
};
