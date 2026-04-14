// ============================================================================
// GET /.well-known/agent.json — A2A Agent Card discovery endpoint
// ============================================================================

import { NextResponse } from "next/server";

export async function GET() {
  const { getAgentCard } = await import("@/lib/a2a");
  const card = getAgentCard("orchestrator");

  return NextResponse.json(card, {
    headers: { "Content-Type": "application/json" },
  });
}
