// Tool 12/18 — Process Fiat Payment
import type { ToolDefinition, ToolResult } from "../agents/types";

function mockTxId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "pi_3";
  for (let i = 0; i < 22; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export const processFiatPaymentTool: ToolDefinition = {
  name: "process_fiat_payment",
  description: "Process a fiat payment via Stripe (card or bank transfer). Returns transaction ID and status.",
  category: "payment",
  parameters: [
    { name: "amount", type: "number", description: "Amount to charge", required: true },
    { name: "currency", type: "string", description: "Currency code", default: "USD" },
    { name: "method", type: "string", description: "Fiat method", required: true, enum: ["card", "bank"] },
    { name: "cardLast4", type: "string", description: "Last 4 digits of card (for display)" },
    { name: "orderId", type: "string", description: "Associated order ID", required: true },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const amount = args.amount as number;
    const method = args.method as string;

    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 500));

    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      return {
        success: false,
        data: { status: "failed", reason: "Card declined — insufficient funds" },
        error: "Payment failed: Card declined",
        executionTimeMs: Date.now() - start,
      };
    }

    const txId = mockTxId();

    return {
      success: true,
      data: {
        transactionId: txId,
        amount,
        currency: args.currency ?? "USD",
        method,
        cardLast4: args.cardLast4 ?? "****",
        status: "completed",
        processor: "Stripe",
        orderId: args.orderId,
        timestamp: Date.now(),
        receipt: `https://pay.stripe.com/receipts/${txId}`,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
