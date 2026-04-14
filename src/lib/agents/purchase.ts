// ============================================================================
// Agent 6/9 — Purchase Agent
// Executes proxy purchases on source marketplaces
// ============================================================================

import { BaseAgent } from "./base";
import type { AgentContext } from "./types";

export class PurchaseAgent extends BaseAgent {
  constructor() {
    super({
      name: "purchase",
      description: "Executes proxy purchases on source marketplaces (Steam, Amazon, Skinport, etc.) on behalf of the buyer after payment and escrow are confirmed.",
      tools: ["execute_purchase"],
      maxIterations: 2,
      timeoutMs: 30000,
    });
  }

  protected async execute(context: AgentContext) {
    const sd = context.sessionData ?? {};
    const source = sd.source as string;
    const itemId = sd.itemId as string;
    const itemName = sd.itemName as string;
    const price = sd.price as number;
    const escrowAddress = sd.escrowAddress as string;
    const deliveryType = sd.deliveryType as string;
    const deliveryTarget = sd.deliveryTarget as string;

    if (!source || !itemId || !price || !escrowAddress) {
      return {
        message: "Missing purchase details. Need: source, itemId, price, escrowAddress.",
      };
    }

    this.think(`Executing purchase: "${itemName}" from ${source} for $${price}`);

    // Determine delivery type
    const resolvedDeliveryType = deliveryType
      ?? (source.toLowerCase().includes("steam") ? "steam_trade" : "shipping");

    const resolvedDeliveryTarget = deliveryTarget
      ?? context.userPreferences.steamTradeUrl
      ?? "pending";

    const result = await this.callTool("execute_purchase", {
      source,
      itemId,
      itemName: itemName ?? "Unknown Item",
      price,
      deliveryType: resolvedDeliveryType,
      deliveryTarget: resolvedDeliveryTarget,
      escrowAddress,
    });

    if (!result.success) {
      return {
        message: `Purchase failed: ${result.error}`,
        data: { status: "purchase_failed", error: result.error },
      };
    }

    const purchaseData = result.data as {
      orderId: string;
      status: string;
      timeline: Array<{ label: string; status: string }>;
      estimatedDelivery: string;
      sourceOrderId: string;
    };

    this.say(`Purchase executed! Order ${purchaseData.orderId} — ${purchaseData.status}`);

    return {
      message: `Purchase executed on ${source}. Order: ${purchaseData.orderId}. Status: ${purchaseData.status}. Estimated delivery: ${purchaseData.estimatedDelivery}`,
      data: purchaseData,
    };
  }
}
