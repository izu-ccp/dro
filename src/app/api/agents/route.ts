// ============================================================================
// GET /api/agents — List agents and tools (Google ADK)
// ============================================================================

import { NextResponse } from "next/server";
import { rootAgent } from "@/lib/adk";
import {
  searchTools,
  steamTools,
  marketplaceTools,
  analysisTools,
  paymentTools,
  purchaseTools,
  trackingTools,
  disputeTools,
} from "@/lib/adk";

export async function GET() {
  const agents = rootAgent.subAgents.map((agent) => ({
    name: agent.name,
    description: (agent as { description?: string }).description ?? "",
    tools: (agent as { tools?: Array<{ name: string }> }).tools?.map((t) => t.name) ?? [],
  }));

  const allTools = [
    ...searchTools,
    ...steamTools,
    ...marketplaceTools,
    ...analysisTools,
    ...paymentTools,
    ...purchaseTools,
    ...trackingTools,
    ...disputeTools,
  ];

  // Deduplicate tools by name
  const seen = new Set<string>();
  const uniqueTools = allTools.filter((t) => {
    if (seen.has(t.name)) return false;
    seen.add(t.name);
    return true;
  });

  return NextResponse.json({
    framework: "Google ADK",
    model: "gemini-2.5-flash",
    agents: [
      {
        name: rootAgent.name,
        description: "Root orchestrator — routes requests to specialist agents via LLM-driven delegation",
        subAgents: agents.map((a) => a.name),
      },
      ...agents,
    ],
    tools: uniqueTools.map((t) => ({
      name: t.name,
      description: (t as { description?: string }).description ?? "",
    })),
    stats: {
      totalAgents: agents.length + 1,
      totalTools: uniqueTools.length,
    },
  });
}
