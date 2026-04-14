// Tool 13/18 — Process Crypto Payment (returns intent for client-side execution)
import type { ToolDefinition, ToolResult } from "../agents/types";
import { ESCROW_FACTORY_ADDRESS, USDC_ADDRESS, USDT_ADDRESS, BLOCK_EXPLORER } from "../contracts/addresses";

export const processCryptoPaymentTool: ToolDefinition = {
  name: "process_crypto_payment",
  description: "Prepare a crypto payment intent for on-chain execution. Returns approval and transfer data for the client wallet.",
  category: "payment",
  parameters: [
    { name: "amount", type: "number", description: "Amount in USD equivalent", required: true },
    { name: "token", type: "string", description: "Token to pay with", required: true, enum: ["USDC", "USDT"] },
    { name: "walletAddress", type: "string", description: "Sender wallet address", required: true },
    { name: "orderId", type: "string", description: "Associated order ID", required: true },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const amount = args.amount as number;
    const token = (args.token as string) ?? "USDC";

    const tokenAddress = token === "USDT" ? USDT_ADDRESS : USDC_ADDRESS;
    const decimals = 6;
    const amountWei = BigInt(Math.round(amount * 10 ** decimals));

    return {
      success: true,
      data: {
        paymentIntent: {
          from: args.walletAddress,
          tokenAddress,
          tokenSymbol: token,
          amount,
          amountWei: "0x" + amountWei.toString(16),
          decimals,
          spender: ESCROW_FACTORY_ADDRESS,
          chain: "celo-sepolia",
          status: "awaiting_signature",
        },
        orderId: args.orderId,
        explorerUrl: BLOCK_EXPLORER,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
