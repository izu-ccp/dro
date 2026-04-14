// ============================================================================
// Agent 9/9 — Orchestrator Agent
// Routes user queries to specialist agents via A2A protocol
// ============================================================================

import { BaseAgent } from "./base";
import type { AgentContext } from "./types";
import {
  sendTask,
  textMessage,
  dataMessage,
  extractText,
  extractData,
} from "../a2a/client";
import type { Task, A2AMessage } from "../a2a/types";
import { geminiJSON, geminiPrompt } from "../ai/gemini";

// Still need these for the constructor agent map (used by listAgents)
import { WebSearchAgent } from "./web-search";
import { SteamAgent } from "./steam";
import { DigitalMarketplaceAgent } from "./digital-marketplace";
import { PriceComparisonAgent } from "./price-comparison";
import { PaymentAgent } from "./payment";
import { PurchaseAgent } from "./purchase";
import { OrderTrackingAgent } from "./order-tracking";
import { DisputeRefundAgent } from "./dispute-refund";

type Intent =
  | "search"
  | "search_steam"
  | "search_marketplace"
  | "compare_prices"
  | "purchase"
  | "pay"
  | "track"
  | "dispute"
  | "conversation"
  | "general";

interface RouteResult {
  intent: Intent;
  agents: string[];
  context: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// A2A helper: send a task to an agent and extract results
// ---------------------------------------------------------------------------

async function a2aSend(
  agentId: string,
  text: string,
  data?: Record<string, unknown>,
): Promise<{ task: Task; message: string; data?: Record<string, unknown> }> {
  const msg: A2AMessage = data
    ? dataMessage("user", data, text)
    : textMessage("user", text);

  const task = await sendTask(agentId, msg, { agentId });

  // Extract response from completed task
  const lastAgentMsg = [...task.messages].reverse().find((m) => m.role === "agent");
  const responseText = lastAgentMsg ? extractText(lastAgentMsg) : task.state;
  const responseData = lastAgentMsg ? extractData(lastAgentMsg) : undefined;

  // Also check artifacts for product data
  const artifactData = task.artifacts
    .flatMap((a) => a.parts)
    .filter((p): p is { type: "data"; data: Record<string, unknown> } => p.type === "data")
    .map((p) => p.data);

  // Merge: prefer response data, fall back to artifact data
  let mergedData = responseData;
  if (!mergedData?.products && artifactData.length > 0) {
    const productArtifact = artifactData.find((d) => d.products);
    if (productArtifact) {
      mergedData = { ...mergedData, ...productArtifact };
    }
  }

  return { task, message: responseText, data: mergedData };
}

// ============================================================================

export class OrchestratorAgent extends BaseAgent {
  private agentInstances: Map<string, BaseAgent>;

  constructor() {
    super({
      name: "orchestrator",
      description: "Routes user requests to specialist agents via A2A protocol. Manages multi-agent workflows.",
      tools: [],
      maxIterations: 10,
      timeoutMs: 60000,
    });

    this.agentInstances = new Map<string, BaseAgent>([
      ["web_search", new WebSearchAgent()],
      ["steam", new SteamAgent()],
      ["digital_marketplace", new DigitalMarketplaceAgent()],
      ["price_comparison", new PriceComparisonAgent()],
      ["payment", new PaymentAgent()],
      ["purchase", new PurchaseAgent()],
      ["order_tracking", new OrderTrackingAgent()],
      ["dispute_refund", new DisputeRefundAgent()],
    ]);
  }

  protected async execute(context: AgentContext) {
    const lastMessage = context.messages[context.messages.length - 1];
    const userQuery = lastMessage?.content ?? "";

    this.think(`Analyzing intent: "${userQuery}"`);

    const route = await this.classifyIntentAI(userQuery, context);

    this.say(`Intent: ${route.intent} → A2A tasks: [${route.agents.join(", ")}]`);

    const enrichedContext: AgentContext = {
      ...context,
      sessionData: { ...context.sessionData, ...route.context },
    };

    if (route.intent === "search") {
      return this.handleSearch(enrichedContext, userQuery, route.agents);
    }
    if (route.intent === "search_steam") {
      return this.handleSteamSearch(enrichedContext, userQuery);
    }
    if (route.intent === "search_marketplace") {
      return this.handleMarketplaceSearch(enrichedContext, userQuery);
    }
    if (route.intent === "compare_prices") {
      return this.handleCompare(enrichedContext);
    }
    if (route.intent === "purchase" || route.intent === "pay") {
      return this.handlePurchase(enrichedContext);
    }
    if (route.intent === "track") {
      return this.handleTrack(enrichedContext);
    }
    if (route.intent === "dispute") {
      return this.handleDispute(enrichedContext);
    }
    if (route.intent === "conversation") {
      return this.handleConversation(userQuery, route.context);
    }

    return {
      message: "I can help you search for products, compare prices, make purchases, track orders, or handle disputes. What would you like to do?",
      data: {
        suggestions: [
          "Search for AK-47 Redline",
          "Compare prices for AWP Asiimov",
          "Track my order PB-20260407-0042",
          "Open a dispute",
        ],
      },
    };
  }

  // ---- AI Intent Classification ------------------------------------------

  private async classifyIntentAI(query: string, context: AgentContext): Promise<RouteResult> {
    // Hard guardrails run first (content filtering) — no LLM needed
    const q = query.toLowerCase();
    if (/\b(porn|xxx|sex|nude|naked|drugs|cocaine|heroin|meth|weapon|gun|ammo|ammunition|explosive|counterfeit|fake\s*id)\b/i.test(q)) {
      return { intent: "conversation", agents: [], context: { query: q, blocked: true } };
    }
    if (/\b(alcohol|beer|wine|liquor|whiskey|vodka|tobacco|cigarette|cigar|vape|cbd|thc|cannabis|marijuana)\b/i.test(q)) {
      return { intent: "conversation", agents: [], context: { query: q, ageRestricted: true } };
    }

    try {
      const sd = context.sessionData ?? {};
      const hasProducts = !!sd.products;
      const hasOrder = !!(sd.orderId || this.extractOrderId(query));

      const result = await geminiJSON<{
        intent: Intent;
        extractedItem?: string;
        reason?: string;
        orderId?: string;
        disputeReason?: string;
      }>(
        `You are an intent classifier for DRO, an AI-powered proxy shopping marketplace. Classify the user's message into one of these intents:

- "search" — user wants to find/buy a general product (electronics, clothes, shoes, bags, etc.)
- "search_steam" — user wants gaming items: CS2/CSGO skins, Steam games, digital game keys, gaming accessories
- "search_marketplace" — user wants digital marketplace items (gift cards, software keys, digital goods)
- "compare_prices" — user wants to compare prices of products they've already searched for (only if products already exist in session: ${hasProducts})
- "purchase" — user wants to buy/checkout a specific item (only if session has item data: ${!!sd.itemId || !!sd.productId})
- "track" — user wants to track an order or check delivery status
- "dispute" — user wants to open a dispute or request a refund (requires order context: ${hasOrder})
- "conversation" — greetings, help requests, questions about how DRO works, complaints, or anything that isn't a product search

Respond with JSON: { "intent": "...", "extractedItem": "cleaned product name if search", "reason": "why this intent", "orderId": "if found", "disputeReason": "if dispute" }`,
        query,
        { temperature: 0.1, maxTokens: 200 },
      );

      const intent = result.intent;
      const itemName = result.extractedItem || this.extractItemName(query);

      // Map intent to agent routing
      switch (intent) {
        case "search":
          return { intent, agents: ["web_search"], context: { itemName } };
        case "search_steam":
          return { intent, agents: ["steam", "digital_marketplace"], context: { itemName } };
        case "search_marketplace":
          return { intent, agents: ["digital_marketplace"], context: { itemName } };
        case "compare_prices":
          return { intent, agents: ["price_comparison"], context: { itemName, products: sd.products } };
        case "purchase":
        case "pay":
          return { intent, agents: ["payment", "purchase"], context: { ...sd } };
        case "track":
          return { intent, agents: ["order_tracking"], context: { orderId: result.orderId || this.extractOrderId(query) || sd.orderId } };
        case "dispute":
          return { intent, agents: ["dispute_refund"], context: { orderId: result.orderId || this.extractOrderId(query) || sd.orderId, reason: result.disputeReason || this.extractDisputeReason(q), description: query } };
        case "conversation":
          return { intent, agents: [], context: { query: q } };
        default:
          return { intent: "general", agents: [], context: {} };
      }
    } catch (err) {
      // Fallback to regex if Gemini fails (rate limit, network, etc.)
      console.warn("Gemini intent classification failed, using regex fallback:", err);
      return this.classifyIntentRegex(query, context);
    }
  }

  // ---- Regex Fallback Classification ------------------------------------

  private classifyIntentRegex(query: string, context: AgentContext): RouteResult {
    const q = query.toLowerCase();
    const sd = context.sessionData ?? {};

    // ── Conversation FIRST — catch questions, complaints, greetings ──
    if (this.isConversational(q)) {
      return { intent: "conversation", agents: [], context: { query: q } };
    }

    // ── Content guardrail — block adult/illegal content ──
    if (/\b(porn|xxx|sex|nude|naked|drugs|cocaine|heroin|meth|weapon|gun|ammo|ammunition|explosive|counterfeit|fake\s*id)\b/i.test(q)) {
      return { intent: "conversation", agents: [], context: { query: q, blocked: true } };
    }

    // ── Age-restricted content — require age confirmation ──
    if (/\b(alcohol|beer|wine|liquor|whiskey|vodka|tobacco|cigarette|cigar|vape|cbd|thc|cannabis|marijuana)\b/i.test(q)) {
      return { intent: "conversation", agents: [], context: { query: q, ageRestricted: true } };
    }

    if (/\b(dispute|refund)\b/i.test(q) && (sd.orderId || this.extractOrderId(query))) {
      return {
        intent: "dispute",
        agents: ["dispute_refund"],
        context: {
          orderId: this.extractOrderId(query) ?? sd.orderId,
          reason: this.extractDisputeReason(q),
          description: query,
        },
      };
    }

    if (/track|status|where|delivery|shipping/i.test(q)) {
      return {
        intent: "track",
        agents: ["order_tracking"],
        context: { orderId: this.extractOrderId(query) ?? sd.orderId },
      };
    }

    if (/buy|purchase|checkout|get this/i.test(q) && (sd.itemId || sd.productId || sd.amount)) {
      return {
        intent: "purchase",
        agents: ["payment", "purchase"],
        context: { ...sd },
      };
    }

    if (/compare|cheapest|best price|best deal|lowest/i.test(q) && sd.products) {
      return {
        intent: "compare_prices",
        agents: ["price_comparison"],
        context: { itemName: this.extractItemName(q), products: sd.products },
      };
    }

    const isGaming = /\b(steam|cs2|csgo|counter-strike|dota|tf2|skin|skins|knife|gloves|sticker|case|crate|key|float|wear|factory new|field-tested|minimal wear|battle-scarred|karambit|awp|ak-?47|m4a[14]|glock|usp|deagle|bayonet|huntsman|butterfly|flip|gut|falchion|shadow|bowie|ursus|talon|classic|nomad|skeleton|paracord|survival|navaja|stiletto|game|games|video\s*game|gaming|epic|playstation|xbox|nintendo|ps5|ps4|switch|rpg|fps|mmorpg|indie|early\s*access|dlc|gta|elden\s*ring|fortnite|valorant|minecraft|cyberpunk|baldur|witcher|zelda|mario|cod|call\s*of\s*duty)\b/i.test(q);

    if (isGaming) {
      return {
        intent: "search_steam",
        agents: ["steam", "digital_marketplace"],
        context: { itemName: this.extractItemName(q) },
      };
    }

    // Conversation / help / complaints — NOT a product search
    if (this.isConversational(q)) {
      return { intent: "conversation", agents: [], context: { query: q } };
    }

    if (q.length > 2) {
      return {
        intent: "search",
        agents: ["web_search", "digital_marketplace"],
        context: { itemName: this.extractItemName(q) },
      };
    }

    return { intent: "general", agents: [], context: {} };
  }

  // ---- A2A Workflow Handlers ---------------------------------------------

  private async handleSearch(context: AgentContext, query: string, routeAgents?: string[]) {
    const agentIds = routeAgents ?? ["web_search"];
    let itemName = (context.sessionData.itemName as string) ?? query;

    // ── AI Query Refinement ──
    // Use Gemini to interpret ambiguous queries and expand them to specific product terms
    let suggestions: string[] | undefined;
    try {
      const refinement = await geminiJSON<{
        ambiguous: boolean;
        refinedQuery: string;
        searchTerms: string[];
        suggestions: string[];
        clarification: string;
      }>(
        `You are a product search reasoning engine for DRO, an online shopping marketplace.

THINK FIRST before deciding what to search. Your job is to reason about what the user actually wants to buy.

## Step 1: Reason about the query
Ask yourself: Is this query specific enough to search a product database? Or could it mean multiple different products?

Examples of reasoning:
- "bat" → AMBIGUOUS. Could mean: cricket bat, baseball bat, table tennis bat, softball bat. Do NOT search. Show suggestions.
- "bank" → AMBIGUOUS. Could mean: power bank, piggy bank. Not a product on its own. Show suggestions.
- "apple" → AMBIGUOUS. Could mean: Apple iPhone, Apple MacBook, Apple Watch, Apple AirPods. Show suggestions.
- "ring" → AMBIGUOUS. Could mean: ring light, jewelry ring, boxing ring bell, phone ring holder. Show suggestions.
- "mouse" → AMBIGUOUS. Could mean: wireless mouse, gaming mouse, mouse pad. Show suggestions.
- "case" → AMBIGUOUS. Could mean: phone case, suitcase, pencil case, AirPods case. Show suggestions.
- "pad" → AMBIGUOUS. Could mean: mouse pad, iPad, notepad, heating pad. Show suggestions.
- "monitor" → SLIGHTLY AMBIGUOUS but clearly a computer monitor. Refine to "computer monitor" and search.
- "laptop" → CLEAR. Search directly.
- "Nike shoes" → CLEAR. Search directly.
- "iPhone 15 Pro" → CLEAR. Search directly.
- "AK-47 Redline" → CLEAR. Search directly.
- "cricket bat under 100" → CLEAR. Search directly for "cricket bat".
- "wireless earbuds" → CLEAR. Search directly.
- "find a bat under 100" → AMBIGUOUS. "bat" alone is vague. Suggest: "Cricket Bat", "Baseball Bat", "Table Tennis Bat".
- "bread" → NOT A PRODUCT we sell (we sell electronics, fashion, gaming, etc). Set ambiguous=true and suggest similar shoppable items or say we don't carry groceries.

## Step 2: Decide
- If ambiguous=true: provide 4-6 specific product suggestions the user can click. Do NOT search.
- If ambiguous=false: provide the refined search query and search terms.

## Rules
- Single common words (bat, bank, ring, case, mouse, pad, ball, fan, light, watch, board, card, key, bar, chain, cup, box, band, set, top) are ALWAYS ambiguous. Always show suggestions.
- 2+ word queries that specify the product type are usually clear (e.g., "cricket bat", "power bank", "mouse pad").
- If the query has a price filter like "under 100", strip it for the search but note it.
- suggestions: 4-6 specific shoppable product names the user can click
- clarification: a short message explaining why you're showing suggestions (e.g., "\"bat\" could refer to several products. What are you looking for?")
- searchTerms: if NOT ambiguous, 1-3 specific search terms for the product database

Respond JSON: { "ambiguous": bool, "refinedQuery": "...", "searchTerms": [...], "suggestions": [...], "clarification": "..." }`,
        `User searched: "${query}"`,
        { temperature: 0.1, maxTokens: 400 },
      );

      if (refinement.ambiguous && refinement.suggestions?.length) {
        // Query is ambiguous — return suggestions without searching
        return {
          message: refinement.clarification ?? `"${query}" could mean several things. What are you looking for?`,
          data: {
            products: [],
            sources: 0,
            query,
            suggestions: refinement.suggestions,
            clarification: refinement.clarification,
          },
        };
      }

      // Use refined query for search
      if (refinement.refinedQuery && refinement.refinedQuery.toLowerCase() !== query.toLowerCase()) {
        this.say(`Refined query: "${query}" → "${refinement.refinedQuery}"`);
        itemName = refinement.refinedQuery;
      }

      // Store suggestions for the response
      if (refinement.suggestions?.length) {
        suggestions = refinement.suggestions;
      }

      // If we have multiple search terms, search them all
      if (refinement.searchTerms?.length > 1) {
        const sessionData = { ...context.sessionData, itemName };
        this.say(`Dispatching A2A tasks to: [${agentIds.join(", ")}] with ${refinement.searchTerms.length} search terms`);

        const allProducts: unknown[] = [];
        const taskSummaries: Array<{ agent: string; taskId: string; state: string; message: string }> = [];

        // Search all terms in parallel across all agents
        const allPromises = refinement.searchTerms.flatMap((term) =>
          agentIds.map((agentId) =>
            a2aSend(agentId, term, { ...sessionData, itemName: term }).catch((err) => ({
              task: null as unknown as Task,
              message: `Agent ${agentId} failed: ${err instanceof Error ? err.message : "unknown"}`,
              data: undefined,
            })),
          ),
        );

        const results = await Promise.all(allPromises);
        const seenNames = new Set<string>();

        for (const { task, message, data } of results) {
          const products = (data?.products as Array<{ name: string }>) ?? [];
          for (const p of products) {
            const key = p.name?.toLowerCase();
            if (!seenNames.has(key)) {
              seenNames.add(key);
              allProducts.push(p);
            }
          }
          taskSummaries.push({
            agent: task?.agentId ?? "unknown",
            taskId: task?.id ?? "n/a",
            state: task?.state ?? "failed",
            message,
          });
        }

        const sourceCount = new Set(taskSummaries.filter((t) => t.state === "completed").map((t) => t.agent)).size;
        let summary = refinement.clarification ?? `Found ${allProducts.length} results for "${itemName}"`;
        if (allProducts.length > 0) {
          try {
            const snap = (allProducts as Array<{ name: string; price: number; source: string }>)
              .slice(0, 6)
              .map((p) => `${p.name} — $${p.price} from ${p.source}`)
              .join("\n");
            summary = await geminiPrompt(
              `You are DRO's search results summarizer. Give a brief 1-2 sentence summary. Mention price range and best deal. No markdown.`,
              `User searched: "${query}" (refined to: "${itemName}")\nFound ${allProducts.length} results from ${sourceCount} sources.\nTop:\n${snap}`,
              { temperature: 0.5, maxTokens: 150 },
            );
          } catch { /* keep default */ }
        }

        return {
          message: summary,
          data: {
            products: allProducts,
            sources: sourceCount,
            query,
            refinedQuery: itemName !== query ? itemName : undefined,
            suggestions,
            clarification: refinement.clarification,
            a2aTasks: taskSummaries,
          },
        };
      }
    } catch (err) {
      // If Gemini fails, continue with original query
      console.warn("Query refinement failed:", err);
    }

    const sessionData = { ...context.sessionData, itemName };

    this.say(`Dispatching A2A tasks to: [${agentIds.join(", ")}]`);

    // Send A2A tasks in parallel
    const taskPromises = agentIds.map((agentId) =>
      a2aSend(agentId, itemName, sessionData).catch((err) => ({
        task: null as unknown as Task,
        message: `Agent ${agentId} failed: ${err instanceof Error ? err.message : "unknown"}`,
        data: undefined,
      })),
    );

    const results = await Promise.all(taskPromises);

    const allProducts: unknown[] = [];
    const taskSummaries: Array<{ agent: string; taskId: string; state: string; message: string }> = [];

    for (const { task, message, data } of results) {
      const products = (data?.products as unknown[]) ?? [];
      allProducts.push(...products);
      taskSummaries.push({
        agent: task?.agentId ?? "unknown",
        taskId: task?.id ?? "n/a",
        state: task?.state ?? "failed",
        message,
      });
    }

    const sourceCount = new Set(taskSummaries.filter((t) => t.state === "completed").map((t) => t.agent)).size;

    // AI-powered search summary
    let summary = `Found ${allProducts.length} results across ${sourceCount} sources for "${query}"`;
    if (allProducts.length > 0) {
      try {
        const productSnapshot = (allProducts as Array<{ name: string; price: number; source: string; rating?: number }>)
          .slice(0, 6)
          .map((p) => `${p.name} — $${p.price} from ${p.source} (${p.rating ?? "N/A"}★)`)
          .join("\n");

        summary = await geminiPrompt(
          `You are DRO's search results summarizer. Give a brief 1-2 sentence summary of the search results. Mention the price range, best deal, and number of sources. Be concise and helpful. No markdown.`,
          `User searched: "${query}"\nFound ${allProducts.length} results from ${sourceCount} sources.\nTop results:\n${productSnapshot}`,
          { temperature: 0.5, maxTokens: 150 },
        );
      } catch {
        // Keep default summary on failure
      }
    }

    return {
      message: summary,
      data: {
        products: allProducts,
        sources: sourceCount,
        query,
        refinedQuery: itemName !== query ? itemName : undefined,
        suggestions,
        a2aTasks: taskSummaries,
      },
    };
  }

  private async handleSteamSearch(context: AgentContext, query: string) {
    const itemName = (context.sessionData.itemName as string) ?? query;
    const sessionData = { ...context.sessionData, itemName };

    const [steamResult, mpResult] = await Promise.all([
      a2aSend("steam", itemName, sessionData),
      a2aSend("digital_marketplace", itemName, sessionData),
    ]);

    const allProducts: unknown[] = [];
    for (const { data } of [steamResult, mpResult]) {
      const products = (data?.products as unknown[]) ?? [];
      allProducts.push(...products);
    }

    return {
      message: `Found ${allProducts.length} CS2 listings via A2A [steam, digital_marketplace]`,
      data: {
        products: allProducts,
        sources: 2,
        query,
        a2aTasks: [
          { agent: "steam", taskId: steamResult.task.id, state: steamResult.task.state },
          { agent: "digital_marketplace", taskId: mpResult.task.id, state: mpResult.task.state },
        ],
      },
    };
  }

  private async handleMarketplaceSearch(context: AgentContext, query: string) {
    const itemName = (context.sessionData.itemName as string) ?? query;
    const result = await a2aSend("digital_marketplace", itemName, context.sessionData);
    return { message: result.message, data: result.data };
  }

  private async handleCompare(context: AgentContext) {
    const result = await a2aSend("price_comparison", "Compare prices", context.sessionData);
    return { message: result.message, data: result.data };
  }

  private async handlePurchase(context: AgentContext) {
    this.say("A2A → payment agent...");
    const paymentResult = await a2aSend("payment", "Process payment", context.sessionData);

    if (paymentResult.task.state === "failed") {
      return { message: `Payment failed: ${paymentResult.message}`, data: paymentResult.data };
    }

    const payData = paymentResult.data ?? {};

    this.say("A2A → purchase agent...");
    const purchaseData = {
      ...context.sessionData,
      escrowAddress: (payData.escrow as Record<string, unknown>)?.address ?? "pending",
      paymentTxId: (payData.payment as Record<string, unknown>)?.transactionId,
    };

    const purchaseResult = await a2aSend("purchase", "Execute purchase", purchaseData);

    return {
      message: purchaseResult.message,
      data: {
        payment: paymentResult.data,
        purchase: purchaseResult.data,
        status: purchaseResult.task.state === "completed" ? "purchase_complete" : "purchase_failed",
        a2aTasks: [
          { agent: "payment", taskId: paymentResult.task.id, state: paymentResult.task.state },
          { agent: "purchase", taskId: purchaseResult.task.id, state: purchaseResult.task.state },
        ],
      },
    };
  }

  private async handleTrack(context: AgentContext) {
    const result = await a2aSend("order_tracking", `Track order ${context.sessionData.orderId}`, context.sessionData);
    return { message: result.message, data: result.data };
  }

  private async handleDispute(context: AgentContext) {
    const result = await a2aSend("dispute_refund", `Dispute order ${context.sessionData.orderId}`, context.sessionData);
    return { message: result.message, data: result.data };
  }

  // ---- Conversation Handler -----------------------------------------------

  private isConversational(q: string): boolean {
    // Questions about the system
    if (/\b(why|how|what|when|can you|do you|does|is it|are you|explain)\b/i.test(q)) return true;
    // Help / health / diagnostics
    if (/\b(help|health|diagnos|check.*system|run.*test|status.*system)\b/i.test(q)) return true;
    // Complaints / feedback
    if (/\b(not working|broken|doesn't work|don't work|no results|sense|wrong|useless|bad|terrible|fix|bug|error|crash|rubbish|trash|stupid)\b/i.test(q)) return true;
    // Greetings / casual
    if (/^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|nice|great|bye|goodbye|gm|gn)\b/i.test(q)) return true;
    return false;
  }

  private async handleConversation(query: string, context?: Record<string, unknown>) {
    const q = query.toLowerCase();
    const blocked = context?.blocked as boolean;
    const ageRestricted = context?.ageRestricted as boolean;

    // Blocked content
    if (blocked) {
      return {
        message: "I can't help with that. DRO is a marketplace for legitimate products only. Please search for something else.",
        data: { type: "blocked" },
      };
    }

    // Age-restricted
    if (ageRestricted) {
      return {
        message: "This product category is age-restricted. Please confirm you are 18+ before searching for alcohol, tobacco, or related products. For now, try searching for other products like electronics, clothing, or games.",
        data: { type: "age_restricted", requiresAgeVerification: true },
      };
    }

    // Health check request — keep this deterministic
    if (/health|diagnos|check.*system|run.*test|status.*system/i.test(q)) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/api/health`);
        const health = await res.json();
        const s = health.summary ?? {};
        return {
          message: `System health: ${health.status?.toUpperCase()}\n✓ ${s.passed ?? 0} passed | ✗ ${s.failed ?? 0} failed | ⚠ ${s.warned ?? 0} warnings\n\nView full report at /health`,
          data: { type: "health", health },
        };
      } catch {
        return { message: "Couldn't run health check. Visit /health for the full dashboard.", data: { type: "health" } };
      }
    }

    // Use Gemini for all other conversational responses
    try {
      const aiResponse = await geminiPrompt(
        `You are DRO, an AI-powered proxy shopping assistant. You help users search products across 10+ platforms (Amazon, eBay, Steam, etc.), compare prices, and buy with smart contract escrow protection.

Your personality: helpful, concise, friendly. Keep responses under 3-4 sentences. Use line breaks for readability.

Capabilities you can mention:
- Search products: "find me a laptop", "Nike shoes under $100"
- Gaming/CS2 skins: "AK-47 Redline", "AWP Dragon Lore"
- Compare prices across stores
- Buy with escrow protection (funds held until delivery confirmed)
- Track orders
- Handle disputes with auto-refund in 14 days

If the user asks something unrelated to shopping, gently redirect. Always suggest a product search when appropriate.
Do NOT use markdown formatting or bullet points with asterisks. Use plain text with • for lists.`,
        query,
        { temperature: 0.8, maxTokens: 300 },
      );

      // Determine response type for data
      let type = "conversation";
      if (/^(hi|hello|hey|yo|sup|gm)/i.test(q)) type = "greeting";
      else if (/thank|thanks/i.test(q)) type = "thanks";
      else if (/help|how.*work/i.test(q)) type = "help";
      else if (/sense|useless|bad|terrible|broken/i.test(q)) type = "apology";

      return { message: aiResponse.trim(), data: { type } };
    } catch {
      // Fallback to static responses if Gemini fails
      if (/^(hi|hello|hey|yo|sup|gm)/i.test(q)) {
        return {
          message: "Hey! I'm DRO — your AI shopping assistant. What are you looking for today?",
          data: { type: "greeting" },
        };
      }
      return {
        message: "I'm DRO, your AI shopping assistant. Tell me what you want to buy — I'll search 10+ platforms and find the best deals for you.",
        data: { type: "fallback" },
      };
    }
  }

  // ---- Helpers -----------------------------------------------------------

  private extractOrderId(query: string): string | undefined {
    return query.match(/(PB|DRO)-\d{8}-\d{4}/i)?.[0];
  }

  private extractDisputeReason(query: string): string {
    const q = query.toLowerCase();
    if (q.includes("not received") || q.includes("didn't receive")) return "not_received";
    if (q.includes("wrong")) return "wrong_item";
    if (q.includes("damaged") || q.includes("broken")) return "damaged";
    if (q.includes("not as described") || q.includes("different")) return "not_as_described";
    return "other";
  }

  private extractItemName(query: string): string {
    return query
      .replace(/^(i\s+)?(wan[t]?\s+to\s+|wanna\s+|need\s+to\s+|looking\s+to\s+|trying\s+to\s+)?/i, "")
      .replace(/^(search|find|look\s*for|buy|purchase|compare|get|show\s*me|order|shop\s*for)\s+/i, "")
      .replace(/\b(cheapest|cheap|best|lowest\s*price|most\s*affordable)\b\s*/i, "")
      .replace(/^(me\s+|us\s+)?(a\s+|an\s+|the\s+|some\s+|any\s+)?/i, "")
      .replace(/\s+(prices?|price\s+comparison|cheap|cheapest|best\s+deal|under\s+\$?\d+)$/i, "")
      .trim() || query;
  }

  // ---- Public API --------------------------------------------------------

  getAgent(name: string): BaseAgent | undefined {
    return this.agentInstances.get(name);
  }

  listAgents(): Array<{ name: string; description: string; tools: string[] }> {
    return Array.from(this.agentInstances.entries()).map(([, agent]) => ({
      name: agent.name,
      description: agent.description,
      tools: agent.tools,
    }));
  }
}
