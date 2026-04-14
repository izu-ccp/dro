// ============================================================================
// POST /api/dispute — Dispute via Google ADK
// ============================================================================

import { NextResponse } from "next/server";
import type { DisputeRequest, DisputeResponse, DisputeResult } from "@/lib/agents/types";
import { runAgent } from "@/lib/adk";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DisputeRequest;
    if (!body.orderId || !body.reason) {
      return NextResponse.json(
        { error: "orderId and reason are required" },
        { status: 400 },
      );
    }

    const result = await runAgent(
      `Dispute order ${body.orderId}: ${body.reason}`,
      {
        sessionData: {
          orderId: body.orderId,
          reason: body.reason,
          description: body.reason,
          evidence: body.evidence,
          requestedResolution: "full_refund",
        },
      },
    );

    const data = result.data ?? {};
    const disputeData = (typeof data.dispute_results === "string"
      ? JSON.parse(data.dispute_results)
      : data.dispute_results) as Record<string, unknown> | undefined;

    return NextResponse.json({
      dispute: (disputeData?.dispute as DisputeResult) ?? {
        disputeId: "unknown",
        orderId: body.orderId,
        status: "opened",
        reason: body.reason,
        openedAt: Date.now(),
      },
      events: [],
    } as DisputeResponse);
  } catch (error) {
    console.error("Dispute API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
