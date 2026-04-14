// ============================================================================
// Agent 10 — Health Monitor Agent
// Monitors user journey, detects breaks, runs E2E tests, suggests fixes
// ============================================================================

import { BaseAgent } from "./base";
import type { AgentContext } from "./types";

export interface HealthCheck {
  name: string;
  endpoint: string;
  method: "GET" | "POST";
  body?: unknown;
  expect: {
    status: number;
    hasResults?: boolean;
    maxTimeMs?: number;
  };
}

export interface HealthResult {
  name: string;
  status: "pass" | "fail" | "warn";
  responseTime: number;
  statusCode?: number;
  error?: string;
  fix?: string;
  details?: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// Full user journey test suite
const JOURNEY_CHECKS: HealthCheck[] = [
  // 1. Homepage loads
  { name: "Homepage", endpoint: "/", method: "GET", expect: { status: 200, maxTimeMs: 5000 } },

  // 2. Dashboard loads
  { name: "Dashboard", endpoint: "/dashboard", method: "GET", expect: { status: 200, maxTimeMs: 5000 } },

  // 3. Search API works with results
  { name: "Search: laptop", endpoint: "/api/search", method: "POST", body: { query: "laptop" }, expect: { status: 200, hasResults: true, maxTimeMs: 10000 } },

  // 4. Search API works for shoes
  { name: "Search: shoes", endpoint: "/api/search", method: "POST", body: { query: "shoes" }, expect: { status: 200, hasResults: true, maxTimeMs: 10000 } },

  // 5. Search API works for games
  { name: "Search: game", endpoint: "/api/search", method: "POST", body: { query: "game" }, expect: { status: 200, hasResults: true, maxTimeMs: 10000 } },

  // 6. Results page loads
  { name: "Results page", endpoint: "/results?q=laptop", method: "GET", expect: { status: 200, maxTimeMs: 5000 } },

  // 7. Checkout page loads
  { name: "Checkout page", endpoint: "/checkout?id=1&name=Test&price=10&source=Test", method: "GET", expect: { status: 200, maxTimeMs: 5000 } },

  // 8. Tracking page loads
  { name: "Tracking page", endpoint: "/tracking", method: "GET", expect: { status: 200, maxTimeMs: 5000 } },

  // 9. Order tracking API
  { name: "Track order", endpoint: "/api/track", method: "POST", body: { orderId: "PB-20260407-0042" }, expect: { status: 200, maxTimeMs: 10000 } },

  // 10. Chat API
  { name: "Chat agent", endpoint: "/api/chat", method: "POST", body: { message: "hello" }, expect: { status: 200, maxTimeMs: 15000 } },

  // 11. A2A discovery
  { name: "A2A discovery", endpoint: "/.well-known/agent.json", method: "GET", expect: { status: 200, maxTimeMs: 3000 } },

  // 12. A2A endpoint
  { name: "A2A agents list", endpoint: "/api/a2a", method: "GET", expect: { status: 200, maxTimeMs: 5000 } },

  // 13. Image proxy
  { name: "Image proxy", endpoint: "/api/img?url=https://cdn.dummyjson.com/products/images/laptops/Apple%20MacBook%20Pro%2014%20Inch%20Space%20Grey/thumbnail.png", method: "GET", expect: { status: 200, maxTimeMs: 8000 } },

  // 14. Purchase API (should work even with mock data)
  {
    name: "Purchase flow",
    endpoint: "/api/purchase",
    method: "POST",
    body: {
      productId: "1",
      source: "Amazon",
      price: 29.99,
      itemName: "Test Product",
      paymentMethod: "card",
      deliveryInfo: { type: "shipping", address: { name: "Test", street: "123 Main", city: "NYC", state: "NY", zip: "10001", country: "US" } },
      cardInfo: { number: "4242424242424242", expiry: "12/28", cvv: "123" },
    },
    expect: { status: 200, maxTimeMs: 15000 },
  },
];

// Known fix suggestions for common failures
const FIX_SUGGESTIONS: Record<string, string> = {
  "Search: laptop": "Check DummyJSON API availability (https://dummyjson.com). Category mapping may need updating in src/lib/tools/web-search.ts",
  "Search: shoes": "Verify 'shoes' maps to 'womens-shoes' category in CATEGORY_MAP in src/lib/tools/web-search.ts",
  "Search: game": "Ensure 'game' triggers gaming intent in orchestrator src/lib/agents/orchestrator.ts isGaming regex",
  "Track order": "Check mock order IDs match in src/lib/tools/track-order.ts. Order PB-20260407-0042 must exist.",
  "Chat agent": "Orchestrator may be failing. Check src/lib/agents/orchestrator.ts classifyIntent for the query.",
  "A2A discovery": "Ensure src/app/.well-known/agent.json/route.ts exists and bootstrapA2A works.",
  "Image proxy": "Check ALLOWED_HOSTS in src/app/api/img/route.ts includes the image CDN domain.",
  "Purchase flow": "Check payment agent src/lib/agents/payment.ts and purchase agent src/lib/agents/purchase.ts for errors.",
};

export class HealthMonitorAgent extends BaseAgent {
  constructor() {
    super({
      name: "health_monitor",
      description: "Monitors the entire user journey, runs E2E health checks on all endpoints, detects failures, and suggests fixes.",
      tools: [],
      maxIterations: 1,
      timeoutMs: 120000,
    });
  }

  protected async execute(context: AgentContext) {
    const sd = context.sessionData ?? {};
    const checkNames = sd.checks as string[] | undefined;

    this.think("Running health checks across the full user journey...");

    const checks = checkNames
      ? JOURNEY_CHECKS.filter((c) => checkNames.some((n) => c.name.toLowerCase().includes(n.toLowerCase())))
      : JOURNEY_CHECKS;

    const results: HealthResult[] = [];
    let passed = 0;
    let failed = 0;
    let warned = 0;

    for (const check of checks) {
      const result = await this.runCheck(check);
      results.push(result);

      if (result.status === "pass") passed++;
      else if (result.status === "fail") failed++;
      else warned++;

      this.emit("status", {
        check: result.name,
        status: result.status,
        time: result.responseTime,
      });
    }

    const overallStatus = failed > 0 ? "unhealthy" : warned > 0 ? "degraded" : "healthy";

    this.say(`Health: ${overallStatus} — ${passed}/${checks.length} passed, ${failed} failed, ${warned} warnings`);

    return {
      message: `System ${overallStatus}: ${passed} passed, ${failed} failed, ${warned} warnings out of ${checks.length} checks`,
      data: {
        status: overallStatus,
        summary: { total: checks.length, passed, failed, warned },
        results,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private async runCheck(check: HealthCheck): Promise<HealthResult> {
    const start = Date.now();

    try {
      const url = `${BASE_URL}${check.endpoint}`;
      const options: RequestInit = {
        method: check.method,
        signal: AbortSignal.timeout(check.expect.maxTimeMs ?? 10000),
      };

      if (check.method === "POST" && check.body) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(check.body);
      }

      const res = await fetch(url, options);
      const responseTime = Date.now() - start;

      // Check status code
      if (res.status !== check.expect.status) {
        return {
          name: check.name,
          status: "fail",
          responseTime,
          statusCode: res.status,
          error: `Expected status ${check.expect.status}, got ${res.status}`,
          fix: FIX_SUGGESTIONS[check.name],
        };
      }

      // Check for results in response body
      if (check.expect.hasResults && check.method === "POST") {
        try {
          const data = await res.json();
          const resultCount = data.results?.length ?? data.order?.timeline?.length ?? (data.message ? 1 : 0);
          if (resultCount === 0) {
            return {
              name: check.name,
              status: "warn",
              responseTime,
              statusCode: res.status,
              error: "Response returned 0 results",
              fix: FIX_SUGGESTIONS[check.name],
              details: JSON.stringify(data).slice(0, 200),
            };
          }
        } catch {
          // If we can't parse JSON, that's OK for some endpoints
        }
      }

      // Check response time
      if (check.expect.maxTimeMs && responseTime > check.expect.maxTimeMs) {
        return {
          name: check.name,
          status: "warn",
          responseTime,
          statusCode: res.status,
          error: `Slow response: ${responseTime}ms (max ${check.expect.maxTimeMs}ms)`,
        };
      }

      return {
        name: check.name,
        status: "pass",
        responseTime,
        statusCode: res.status,
      };
    } catch (err) {
      return {
        name: check.name,
        status: "fail",
        responseTime: Date.now() - start,
        error: err instanceof Error ? err.message : "Check failed",
        fix: FIX_SUGGESTIONS[check.name] ?? "Check server logs for errors",
      };
    }
  }
}
