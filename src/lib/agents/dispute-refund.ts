// ============================================================================
// Agent 8/9 — Dispute & Refund Agent
// Handles disputes, evidence collection, and refund processing
// ============================================================================

import { BaseAgent } from "./base";
import type { AgentContext, DisputeResult } from "./types";

export class DisputeRefundAgent extends BaseAgent {
  constructor() {
    super({
      name: "dispute_refund",
      description: "Handles order disputes, collects evidence, initiates the dispute resolution process, and manages refunds through the escrow system.",
      tools: ["initiate_dispute", "track_order"],
      maxIterations: 3,
      timeoutMs: 15000,
    });
  }

  protected async execute(context: AgentContext) {
    const sd = context.sessionData ?? {};
    const orderId = sd.orderId as string;
    const reason = (sd.reason as string) ?? "not_received";
    const description = (sd.description as string) ?? "Item not received as expected";
    const evidence = sd.evidence as string | undefined;
    const requestedResolution = (sd.requestedResolution as string) ?? "full_refund";

    if (!orderId) {
      return { message: "No order ID provided for dispute." };
    }

    this.think(`Initiating dispute for order: ${orderId}`);

    // Step 1: Verify order exists and get current status
    const orderResult = await this.callTool("track_order", { orderId });

    if (!orderResult.success) {
      return {
        message: `Cannot dispute — order ${orderId} not found.`,
        data: { status: "order_not_found" },
      };
    }

    const order = orderResult.data as {
      status: string;
      escrow?: { status: string; amount: number; expiresAt: number };
    };

    // Check if order is eligible for dispute
    if (order.status === "delivered") {
      this.say("Order marked as delivered. Dispute will be reviewed as post-delivery claim.");
    }

    if (order.escrow?.status === "released") {
      return {
        message: "Cannot dispute — escrow has already been released. Contact support for post-escrow claims.",
        data: { status: "escrow_released", orderId },
      };
    }

    // Step 2: Initiate dispute
    const disputeResult = await this.callTool("initiate_dispute", {
      orderId,
      reason,
      description,
      evidence: evidence ?? undefined,
      requestedResolution,
    });

    if (!disputeResult.success) {
      return {
        message: `Dispute creation failed: ${disputeResult.error}`,
        data: { status: "dispute_failed", error: disputeResult.error },
      };
    }

    const disputeData = disputeResult.data as {
      dispute: DisputeResult;
      actions: { escrow: string; seller: string; timeline: string };
      nextSteps: string[];
    };

    this.say(`Dispute ${disputeData.dispute.disputeId} opened. Escrow frozen.`);

    return {
      message: `Dispute opened: ${disputeData.dispute.disputeId}. Reason: ${reason}. Escrow funds frozen pending resolution. Estimated resolution: ${(disputeData.dispute as DisputeResult & { estimatedResolution?: string }).openedAt ? "3 business days" : "pending"}.`,
      data: disputeData,
    };
  }
}
