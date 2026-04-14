// GET /api/health — Run full E2E health checks
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { initializeTools } = await import("@/lib/tools");
    const { HealthMonitorAgent } = await import("@/lib/agents/health-monitor");

    initializeTools();
    const agent = new HealthMonitorAgent();

    const result = await agent.run({
      conversationId: `health_${Date.now()}`,
      messages: [{ id: "1", role: "user", content: "Run health checks", timestamp: Date.now() }],
      userPreferences: { paymentMode: "fiat", currency: "USD" },
      sessionData: {},
    });

    const data = result.data as { status: string; summary: object; results: object[]; timestamp: string };

    return NextResponse.json(data, {
      status: data.status === "healthy" ? 200 : data.status === "degraded" ? 200 : 503,
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Health check failed",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
