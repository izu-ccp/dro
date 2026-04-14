// ============================================================================
// A2A Protocol — Public API & Agent Registration
// ============================================================================

export * from "./types";
export { agentCards, getAgentCard, getAllAgentCards } from "./agent-card";
export { taskStore } from "./task-store";
export {
  sendTask,
  getTask,
  cancelTask,
  textMessage,
  dataMessage,
  extractText,
  extractData,
  registerExecutor,
  buildTaskParams,
} from "./client";
export { handleA2ARequest } from "./server";

// ---------------------------------------------------------------------------
// Bootstrap — Register all agent executors with the A2A system
// ---------------------------------------------------------------------------

import { registerExecutor, textMessage, dataMessage, extractText, extractData } from "./client";
import { initializeTools } from "../tools";
import type { Task } from "./types";
import type { AgentContext } from "../agents/types";

let bootstrapped = false;

export async function bootstrapA2A(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  initializeTools();

  // Dynamically import agents to avoid circular deps
  const { WebSearchAgent } = await import("../agents/web-search");
  const { SteamAgent } = await import("../agents/steam");
  const { DigitalMarketplaceAgent } = await import("../agents/digital-marketplace");
  const { PriceComparisonAgent } = await import("../agents/price-comparison");
  const { PaymentAgent } = await import("../agents/payment");
  const { PurchaseAgent } = await import("../agents/purchase");
  const { OrderTrackingAgent } = await import("../agents/order-tracking");
  const { DisputeRefundAgent } = await import("../agents/dispute-refund");
  const { OrchestratorAgent } = await import("../agents/orchestrator");

  // Create agent instances
  const agents = {
    web_search: new WebSearchAgent(),
    steam: new SteamAgent(),
    digital_marketplace: new DigitalMarketplaceAgent(),
    price_comparison: new PriceComparisonAgent(),
    payment: new PaymentAgent(),
    purchase: new PurchaseAgent(),
    order_tracking: new OrderTrackingAgent(),
    dispute_refund: new DisputeRefundAgent(),
    orchestrator: new OrchestratorAgent(),
  };

  // Helper: convert A2A Task → AgentContext
  function taskToContext(task: Task): AgentContext {
    const lastMsg = task.messages[task.messages.length - 1];
    const text = extractText(lastMsg);
    const data = extractData(lastMsg) ?? {};

    return {
      conversationId: task.id,
      messages: [{ id: task.id, role: "user", content: text, timestamp: Date.now() }],
      userPreferences: {
        paymentMode: (data.paymentMode as "fiat" | "crypto") ?? "fiat",
        currency: (data.currency as string) ?? "USD",
        steamTradeUrl: data.steamTradeUrl as string | undefined,
        shippingAddress: data.shippingAddress as AgentContext["userPreferences"]["shippingAddress"],
      },
      sessionData: data,
    };
  }

  // Register each agent as an A2A executor
  for (const [id, agent] of Object.entries(agents)) {
    registerExecutor(id, async (task: Task) => {
      const context = taskToContext(task);
      const result = await agent.run(context);

      const artifacts = [];

      // If the result has products, emit as artifact
      const resultData = result.data as Record<string, unknown> | undefined;
      if (resultData?.products) {
        artifacts.push({
          name: "products",
          data: { products: resultData.products, count: (resultData.products as unknown[]).length },
        });
      }

      // If the result has order data, emit as artifact
      if (resultData?.payment || resultData?.purchase || resultData?.order) {
        artifacts.push({
          name: "transaction",
          data: resultData,
        });
      }

      return {
        message: result.message,
        data: resultData as Record<string, unknown> | undefined,
        artifacts,
      };
    });
  }
}
