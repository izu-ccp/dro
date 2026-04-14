// ============================================================================
// Agent 4/9 — Price Comparison Agent
// Compares prices across all sources and recommends the best deal
// ============================================================================

import { BaseAgent } from "./base";
import type { AgentContext, AgentProduct } from "./types";

export class PriceComparisonAgent extends BaseAgent {
  constructor() {
    super({
      name: "price_comparison",
      description: "Compares prices for the same item across all sources, calculates fees, and recommends the best deal based on user preferences.",
      tools: ["compare_prices", "calculate_fees"],
      maxIterations: 3,
      timeoutMs: 10000,
    });
  }

  protected async execute(context: AgentContext) {
    const sessionData = context.sessionData ?? {};
    const products = (sessionData.products as AgentProduct[]) ?? [];
    const itemName = (sessionData.itemName as string) ?? "Unknown Item";
    const preferTier = (sessionData.preferTier as string) ?? "any";

    if (products.length === 0) {
      return { message: "No products to compare. Run a search first." };
    }

    this.think(`Comparing ${products.length} listings for "${itemName}"`);

    // Step 1: Compare base prices
    const priceEntries = products.map((p) => ({
      source: p.source,
      price: p.price,
      currency: p.currency ?? "USD",
      tier: p.tier,
      delivery: p.delivery,
      float: p.float,
      url: p.url,
    }));

    const compareResult = await this.callTool("compare_prices", {
      itemName,
      prices: priceEntries,
      preferTier,
    });

    if (!compareResult.success) {
      return { message: `Price comparison failed: ${compareResult.error}` };
    }

    const comparison = compareResult.data as {
      comparison: Array<{
        rank: number;
        source: string;
        price: number;
        tier: string;
        savingsVsMax: number;
        savingsPercent: number;
      }>;
      summary: {
        cheapest: { source: string; price: number };
        averagePrice: number;
        priceSpread: number;
      };
      recommended: {
        source: string;
        price: number;
        tier: string;
        reason: string;
      };
    };

    this.say(`Best price: $${comparison.summary.cheapest.price} on ${comparison.summary.cheapest.source}`);

    // Step 2: Calculate total cost with fees for top 3
    const paymentMethod = context.userPreferences.paymentMode === "crypto" ? "crypto" : "card";
    const topResults = comparison.comparison.slice(0, 3);
    const withFees = [];

    for (const result of topResults) {
      const feesResult = await this.callTool("calculate_fees", {
        itemPrice: result.price,
        source: result.source,
        paymentMethod,
        currency: "USD",
      });

      if (feesResult.success) {
        const fees = feesResult.data as {
          total: number;
          totalFees: number;
          fees: { protocol: { amount: number }; platform: { amount: number }; processing: { amount: number } };
        };
        withFees.push({
          ...result,
          totalWithFees: fees.total,
          fees: fees.totalFees,
          breakdown: fees.fees,
        });
      }
    }

    // Sort by total cost
    withFees.sort((a, b) => a.totalWithFees - b.totalWithFees);

    return {
      message: `Compared ${products.length} listings. Best deal: $${withFees[0]?.totalWithFees.toFixed(2)} total on ${withFees[0]?.source} (incl. fees)`,
      data: {
        comparison: comparison.comparison,
        withFees,
        recommended: comparison.recommended,
        summary: comparison.summary,
        paymentMethod,
      },
    };
  }
}
