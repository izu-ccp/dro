// Tool 11/18 — Calculate Fees
import type { ToolDefinition, ToolResult } from "../agents/types";

export const calculateFeesTool: ToolDefinition = {
  name: "calculate_fees",
  description: "Calculate protocol fees, platform fees, and total cost for a purchase including escrow costs",
  category: "analysis",
  parameters: [
    { name: "itemPrice", type: "number", description: "Base item price", required: true },
    { name: "source", type: "string", description: "Source marketplace", required: true },
    { name: "paymentMethod", type: "string", description: "Payment method", required: true, enum: ["card", "bank", "crypto"] },
    { name: "currency", type: "string", description: "Currency code", default: "USD" },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const price = args.itemPrice as number;
    const method = args.paymentMethod as string;

    const PROTOCOL_FEE_RATE = 0.01; // 1%
    const PLATFORM_FEE_RATE = 0.01; // 1%
    const CARD_PROCESSING_RATE = 0.029; // 2.9%
    const CARD_FIXED_FEE = 0.30;
    const CRYPTO_GAS_ESTIMATE = 2.50; // estimated gas

    const protocolFee = Math.round(price * PROTOCOL_FEE_RATE * 100) / 100;
    const platformFee = Math.round(price * PLATFORM_FEE_RATE * 100) / 100;

    let processingFee = 0;
    if (method === "card") {
      processingFee = Math.round((price * CARD_PROCESSING_RATE + CARD_FIXED_FEE) * 100) / 100;
    } else if (method === "crypto") {
      processingFee = CRYPTO_GAS_ESTIMATE;
    }

    const subtotal = price + protocolFee + platformFee + processingFee;
    const total = Math.round(subtotal * 100) / 100;

    return {
      success: true,
      data: {
        itemPrice: price,
        source: args.source,
        paymentMethod: method,
        currency: args.currency ?? "USD",
        fees: {
          protocol: { rate: PROTOCOL_FEE_RATE, amount: protocolFee, label: "DRO Protocol Fee (1%)" },
          platform: { rate: PLATFORM_FEE_RATE, amount: platformFee, label: "Platform Fee (1%)" },
          processing: {
            amount: processingFee,
            label: method === "card"
              ? `Card Processing (2.9% + $0.30)`
              : method === "crypto"
                ? "Estimated Gas Fee"
                : "No processing fee",
          },
        },
        totalFees: Math.round((protocolFee + platformFee + processingFee) * 100) / 100,
        total,
        escrowAmount: Math.round((price + protocolFee) * 100) / 100,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
