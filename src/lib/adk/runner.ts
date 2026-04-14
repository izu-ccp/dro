// ============================================================================
// DRO × Google ADK — Runner & Session Management
// Replaces the custom A2A protocol + in-memory task store
// ============================================================================

import { Runner, InMemorySessionService, type Event } from "@google/adk";
import { rootAgent } from "./agents";

// ---------------------------------------------------------------------------
// Session Service — in-memory for dev, swap for DatabaseSessionService in prod
// ---------------------------------------------------------------------------
const sessionService = new InMemorySessionService();

// ---------------------------------------------------------------------------
// Runner — the ADK execution engine
// ---------------------------------------------------------------------------
const runner = new Runner({
  appName: "dro",
  agent: rootAgent,
  sessionService,
});

// ---------------------------------------------------------------------------
// Public API: run a user message through the agent system
// ---------------------------------------------------------------------------

export interface DroRunResult {
  sessionId: string;
  response: string;
  events: Event[];
  data?: Record<string, unknown>;
}

export async function runAgent(
  message: string,
  options?: {
    userId?: string;
    sessionId?: string;
    sessionData?: Record<string, unknown>;
  },
): Promise<DroRunResult> {
  const userId = options?.userId ?? "anonymous";
  let sessionId = options?.sessionId;

  // Create or reuse a session
  if (!sessionId) {
    const session = await sessionService.createSession({
      appName: "dro",
      userId,
      state: options?.sessionData ?? {},
    });
    sessionId = session.id;
  } else if (options?.sessionData) {
    const session = await sessionService.getSession({
      appName: "dro",
      userId,
      sessionId,
    });
    if (session) {
      Object.assign(session.state, options.sessionData);
    }
  }

  // Build user content
  const content = {
    role: "user" as const,
    parts: [{ text: message }],
  };

  // Run the agent
  const events: Event[] = [];
  let finalResponse = "";
  let responseData: Record<string, unknown> | undefined;

  // Collect tool results (products, etc.) from function responses
  const toolResults: Record<string, unknown>[] = [];

  for await (const event of runner.runAsync({
    userId,
    sessionId: sessionId!,
    newMessage: content,
  })) {
    events.push(event);

    if (event.content?.parts) {
      for (const part of event.content.parts) {
        // Capture final text response (skip parts that are function calls)
        if ("text" in part && part.text) {
          if (!event.content.parts.some((p) => "functionCall" in p)) {
            finalResponse = part.text;
          }
        }

        // Capture tool results from functionResponse parts
        if ("functionResponse" in part) {
          const fr = part as { functionResponse: { name: string; response: unknown } };
          if (fr.functionResponse?.response) {
            toolResults.push({
              tool: fr.functionResponse.name,
              data: fr.functionResponse.response,
            });
          }
        }
      }
    }

    // Collect state data from events
    if (event.actions?.stateDelta) {
      responseData = { ...responseData, ...event.actions.stateDelta };
    }
  }

  // Also pull data from session state (agents write via outputKey)
  const session = await sessionService.getSession({
    appName: "dro",
    userId,
    sessionId: sessionId!,
  });

  if (session?.state) {
    const stateData: Record<string, unknown> = {};
    for (const key of [
      "web_search_results",
      "steam_results",
      "marketplace_results",
      "comparison_results",
      "payment_results",
      "purchase_results",
      "tracking_results",
      "dispute_results",
    ]) {
      if (session.state[key]) {
        stateData[key] = session.state[key];
      }
    }
    if (Object.keys(stateData).length > 0) {
      responseData = { ...responseData, ...stateData };
    }
  }

  // Attach tool results so callers can extract products
  if (toolResults.length > 0) {
    responseData = { ...responseData, _toolResults: toolResults };
  }

  return {
    sessionId: sessionId!,
    response: finalResponse,
    events,
    data: responseData,
  };
}

// ---------------------------------------------------------------------------
// Helper: extract products from run result (for search API compatibility)
// ---------------------------------------------------------------------------

export function extractProducts(result: DroRunResult): unknown[] {
  const data = result.data ?? {};
  const products: unknown[] = [];

  // 1. Check outputKey state data
  for (const key of ["web_search_results", "steam_results", "marketplace_results"]) {
    const val = data[key];
    if (!val) continue;

    let parsed: Record<string, unknown> | undefined;
    if (typeof val === "string") {
      try { parsed = JSON.parse(val); } catch { continue; }
    } else if (typeof val === "object") {
      parsed = val as Record<string, unknown>;
    }

    if (parsed) {
      const items = parsed.results ?? parsed.listings ?? parsed.products;
      if (Array.isArray(items)) products.push(...items);
    }
  }

  if (products.length > 0) return products;

  // 2. Extract from tool results captured during execution
  const toolResults = data._toolResults as Array<{ tool: string; data: unknown }> | undefined;
  if (toolResults) {
    for (const tr of toolResults) {
      const d = tr.data as Record<string, unknown> | undefined;
      if (!d) continue;
      const items = d.results ?? d.listings ?? d.products;
      if (Array.isArray(items)) products.push(...items);
    }
  }

  return products;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export { runner, sessionService };
