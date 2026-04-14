// Tool 14/18 — Create Escrow (Oak-inspired on-chain escrow intent)
import type { ToolDefinition, ToolResult } from "../agents/types";
import { ESCROW_FACTORY_ADDRESS, USDC_ADDRESS, USDT_ADDRESS, BLOCK_EXPLORER, DEFAULT_ESCROW_DEADLINE_DAYS } from "../contracts/addresses";

export const createEscrowTool: ToolDefinition = {
  name: "create_escrow",
  description: "Create an on-chain escrow intent for a purchase. Returns data for the client to execute via MetaMask.",
  category: "payment",
  parameters: [
    { name: "buyerAddress", type: "string", description: "Buyer wallet address", required: true },
    { name: "sellerSource", type: "string", description: "Seller marketplace source", required: true },
    { name: "amount", type: "number", description: "Escrow amount in USD", required: true },
    { name: "orderId", type: "string", description: "Associated order ID", required: true },
    { name: "token", type: "string", description: "Payment token: USDC or USDT", default: "USDC" },
    { name: "timeoutDays", type: "number", description: "Auto-refund timeout in days", default: 14 },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();
    const timeoutDays = (args.timeoutDays as number) ?? DEFAULT_ESCROW_DEADLINE_DAYS;
    const token = (args.token as string) ?? "USDC";
    const amount = args.amount as number;
    const orderId = args.orderId as string;
    const buyer = (args.buyerAddress as string) || "0x0000000000000000000000000000000000000000";

    // Determine token address and decimals
    const tokenAddress = token === "USDT" ? USDT_ADDRESS : USDC_ADDRESS;
    const decimals = 6; // Both USDC and USDT use 6 decimals
    const amountWei = BigInt(Math.round(amount * 10 ** decimals));
    const deadline = Math.floor(Date.now() / 1000) + timeoutDays * 24 * 60 * 60;

    return {
      success: true,
      data: {
        escrow: {
          factoryAddress: ESCROW_FACTORY_ADDRESS,
          buyer,
          seller: `dro_proxy_${args.sellerSource}`,
          tokenAddress,
          tokenSymbol: token,
          amount,
          amountWei: "0x" + amountWei.toString(16),
          currency: "USD",
          status: "awaiting_signature",
          createdAt: Date.now(),
          deadline,
          deadlineDate: new Date(deadline * 1000).toISOString(),
          timeoutDays,
        },
        orderId,
        // Client-side transaction steps
        txSteps: [
          {
            step: 1,
            action: "approve",
            description: `Approve ${token} spending`,
            to: tokenAddress,
            spender: ESCROW_FACTORY_ADDRESS,
            amount: "0x" + amountWei.toString(16),
          },
          {
            step: 2,
            action: "fund_escrow",
            description: "Fund escrow contract",
            to: ESCROW_FACTORY_ADDRESS,
            orderId,
            buyer,
            tokenAddress,
            amount: "0x" + amountWei.toString(16),
            deadline,
          },
        ],
        guarantees: [
          "Funds locked in smart contract until delivery confirmation",
          `Auto-refund after ${timeoutDays} days if undelivered`,
          "On-chain dispute resolution available",
          "Verifiable on Celo Sepolia block explorer",
        ],
        explorerUrl: `${BLOCK_EXPLORER}/address/${ESCROW_FACTORY_ADDRESS}`,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
