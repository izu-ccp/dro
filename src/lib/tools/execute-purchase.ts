// Tool 15/18 — Execute Purchase
import type { ToolDefinition, ToolResult } from "../agents/types";

function mockOrderId(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, "0");
  return `DRO-${dateStr}-${seq}`;
}

export const executePurchaseTool: ToolDefinition = {
  name: "execute_purchase",
  description: "Execute a proxy purchase on the source marketplace on behalf of the buyer. The DRO agent purchases the item and arranges delivery.",
  category: "purchase",
  parameters: [
    { name: "source", type: "string", description: "Source marketplace", required: true },
    { name: "itemId", type: "string", description: "Item ID on the source platform", required: true },
    { name: "itemName", type: "string", description: "Item name for records", required: true },
    { name: "price", type: "number", description: "Expected price", required: true },
    { name: "deliveryType", type: "string", description: "Delivery method", required: true, enum: ["steam_trade", "shipping", "digital_key", "instant"] },
    { name: "deliveryTarget", type: "string", description: "Steam trade URL or shipping address ID", required: true },
    { name: "escrowAddress", type: "string", description: "Escrow contract address", required: true },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const source = args.source as string;
    const deliveryType = args.deliveryType as string;

    // Simulate purchase execution time
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

    const orderId = mockOrderId();
    const now = Date.now();

    const statusByDelivery: Record<string, string> = {
      steam_trade: "trade_offer_sent",
      shipping: "order_placed",
      digital_key: "key_delivered",
      instant: "delivered",
    };

    const timelineByDelivery: Record<string, Array<{ label: string; time: string; status: "done" | "active" | "pending" }>> = {
      steam_trade: [
        { label: "Payment Verified", time: new Date(now).toLocaleTimeString(), status: "done" },
        { label: "Escrow Funded", time: new Date(now + 1000).toLocaleTimeString(), status: "done" },
        { label: `Purchasing from ${source}`, time: new Date(now + 3000).toLocaleTimeString(), status: "done" },
        { label: "Trade Offer Sent", time: new Date(now + 8000).toLocaleTimeString(), status: "active" },
        { label: "Delivery Confirmed", time: "", status: "pending" },
        { label: "Escrow Released", time: "", status: "pending" },
      ],
      shipping: [
        { label: "Payment Verified", time: new Date(now).toLocaleTimeString(), status: "done" },
        { label: "Escrow Funded", time: new Date(now + 1000).toLocaleTimeString(), status: "done" },
        { label: `Order Placed on ${source}`, time: new Date(now + 5000).toLocaleTimeString(), status: "done" },
        { label: "Awaiting Shipment", time: "", status: "active" },
        { label: "Shipped", time: "", status: "pending" },
        { label: "Delivered", time: "", status: "pending" },
        { label: "Escrow Released", time: "", status: "pending" },
      ],
      digital_key: [
        { label: "Payment Verified", time: new Date(now).toLocaleTimeString(), status: "done" },
        { label: "Escrow Funded", time: new Date(now + 1000).toLocaleTimeString(), status: "done" },
        { label: `Purchased from ${source}`, time: new Date(now + 3000).toLocaleTimeString(), status: "done" },
        { label: "Key Delivered", time: new Date(now + 4000).toLocaleTimeString(), status: "done" },
        { label: "Confirm Receipt", time: "", status: "active" },
        { label: "Escrow Released", time: "", status: "pending" },
      ],
      instant: [
        { label: "Payment Verified", time: new Date(now).toLocaleTimeString(), status: "done" },
        { label: "Escrow Funded", time: new Date(now + 1000).toLocaleTimeString(), status: "done" },
        { label: `Purchased from ${source}`, time: new Date(now + 2000).toLocaleTimeString(), status: "done" },
        { label: "Item Delivered", time: new Date(now + 3000).toLocaleTimeString(), status: "done" },
        { label: "Escrow Released", time: new Date(now + 4000).toLocaleTimeString(), status: "done" },
      ],
    };

    return {
      success: true,
      data: {
        orderId,
        source,
        itemId: args.itemId,
        itemName: args.itemName,
        price: args.price,
        status: statusByDelivery[deliveryType] ?? "processing",
        deliveryType,
        deliveryTarget: args.deliveryTarget,
        escrowAddress: args.escrowAddress,
        timeline: timelineByDelivery[deliveryType] ?? [],
        sourceOrderId: `${source.toUpperCase()}-${Math.floor(Math.random() * 999999999)}`,
        estimatedDelivery: deliveryType === "shipping"
          ? new Date(now + 3 * 86400000).toISOString().split("T")[0]
          : deliveryType === "steam_trade"
            ? "Pending trade acceptance"
            : "Instant",
        createdAt: now,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
