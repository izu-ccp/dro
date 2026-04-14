// Tool 18/18 — Initiate Dispute
import type { ToolDefinition, ToolResult } from "../agents/types";

function mockDisputeId(): string {
  return `DSP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9999).toString().padStart(4, "0")}`;
}

export const initiateDisputeTool: ToolDefinition = {
  name: "initiate_dispute",
  description: "Open a dispute on an order. Freezes escrow and initiates the dispute resolution process.",
  category: "dispute",
  parameters: [
    { name: "orderId", type: "string", description: "Order to dispute", required: true },
    { name: "reason", type: "string", description: "Dispute reason", required: true, enum: ["not_received", "wrong_item", "damaged", "not_as_described", "other"] },
    { name: "description", type: "string", description: "Detailed description of the issue", required: true },
    { name: "evidence", type: "string", description: "URLs or references to evidence (screenshots, etc.)" },
    { name: "requestedResolution", type: "string", description: "Desired resolution", enum: ["full_refund", "partial_refund", "replacement", "other"] },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const orderId = args.orderId as string;
    const reason = args.reason as string;

    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    const disputeId = mockDisputeId();
    const now = Date.now();

    return {
      success: true,
      data: {
        dispute: {
          disputeId,
          orderId,
          status: "opened",
          reason,
          description: args.description,
          evidence: args.evidence ?? null,
          requestedResolution: args.requestedResolution ?? "full_refund",
          openedAt: now,
          escrowFrozen: true,
          estimatedResolution: new Date(now + 3 * 86400000).toISOString().split("T")[0],
        },
        actions: {
          escrow: "Escrow funds frozen pending resolution",
          seller: "Seller notified of dispute",
          timeline: "Estimated resolution within 3 business days",
        },
        nextSteps: [
          "Our team will review the dispute within 24 hours",
          "You may be asked to provide additional evidence",
          "If the seller does not respond within 48 hours, auto-resolution in buyer's favor",
          "Escrow remains frozen throughout the dispute process",
        ],
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
