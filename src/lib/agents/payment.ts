// ============================================================================
// Agent 5/9 — Payment Agent
// Handles fiat and crypto payments, creates escrow contracts
// ============================================================================

import { BaseAgent } from "./base";
import type { AgentContext, EscrowContract, PaymentResult } from "./types";

export class PaymentAgent extends BaseAgent {
  constructor() {
    super({
      name: "payment",
      description: "Processes payments (fiat via Stripe, crypto via wallet) and deploys escrow smart contracts to protect buyer funds.",
      tools: [
        "calculate_fees",
        "process_fiat_payment",
        "process_crypto_payment",
        "create_escrow",
      ],
      maxIterations: 4,
      timeoutMs: 30000,
    });
  }

  protected async execute(context: AgentContext) {
    const sessionData = context.sessionData ?? {};
    const amount = sessionData.amount as number;
    const orderId = sessionData.orderId as string;
    const source = (sessionData.source as string) ?? "Unknown";

    if (!amount || !orderId) {
      return { message: "Missing payment details (amount, orderId)" };
    }

    const paymentMode = context.userPreferences.paymentMode;
    const method = paymentMode === "crypto" ? "crypto" : "card";

    this.think(`Processing ${method} payment of $${amount} for order ${orderId}`);

    // Step 1: Calculate fees
    const feesResult = await this.callTool("calculate_fees", {
      itemPrice: amount,
      source,
      paymentMethod: method,
    });

    if (!feesResult.success) {
      return { message: `Fee calculation failed: ${feesResult.error}` };
    }

    const fees = feesResult.data as {
      total: number;
      escrowAmount: number;
    };

    this.say(`Total charge: $${fees.total.toFixed(2)} (including fees)`);

    // Step 2: Process payment
    let paymentData: PaymentResult | null = null;

    if (method === "card") {
      const payResult = await this.callTool("process_fiat_payment", {
        amount: fees.total,
        currency: "USD",
        method: "card",
        cardLast4: (sessionData.cardLast4 as string) ?? "4242",
        orderId,
      });

      if (!payResult.success) {
        return {
          message: `Payment failed: ${payResult.error}`,
          data: { status: "payment_failed", error: payResult.error },
        };
      }

      const pd = payResult.data as {
        transactionId: string;
        status: string;
      };
      paymentData = {
        success: true,
        transactionId: pd.transactionId,
        amount: fees.total,
        currency: "USD",
        method: "card",
        status: pd.status as PaymentResult["status"],
      };
    } else {
      const walletAddress = (sessionData.walletAddress as string) ?? "0x0000...0000";
      const token = (sessionData.token as string) ?? "USDC";

      const payResult = await this.callTool("process_crypto_payment", {
        amount: fees.total,
        token,
        chain: (sessionData.chain as string) ?? "ethereum",
        walletAddress,
        orderId,
      });

      if (!payResult.success) {
        return {
          message: `Crypto payment failed: ${payResult.error}`,
          data: { status: "payment_failed", error: payResult.error },
        };
      }

      const pd = payResult.data as {
        transactionHash: string;
        status: string;
      };
      paymentData = {
        success: true,
        transactionId: pd.transactionHash,
        amount: fees.total,
        currency: "USD",
        method: "crypto",
        status: pd.status as PaymentResult["status"],
      };
    }

    this.say("Payment processed. Creating escrow...");

    // Step 3: Create escrow
    const escrowResult = await this.callTool("create_escrow", {
      buyerAddress: paymentData.transactionId,
      sellerSource: source,
      amount: fees.escrowAmount,
      orderId,
      timeoutDays: 14,
    });

    let escrow: EscrowContract | null = null;
    if (escrowResult.success) {
      const ed = escrowResult.data as {
        escrow: EscrowContract;
      };
      escrow = ed.escrow;
      paymentData.escrow = escrow;
    }

    return {
      message: `Payment of $${fees.total.toFixed(2)} processed successfully. Escrow deployed at ${escrow?.address ?? "pending"}.`,
      data: {
        payment: paymentData,
        escrow,
        fees: feesResult.data,
      },
    };
  }
}
