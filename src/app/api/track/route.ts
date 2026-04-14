// ============================================================================
// POST /api/track — Order tracking via Google ADK
// ============================================================================

import { NextResponse } from "next/server";
import type { TrackRequest, TrackResponse } from "@/lib/agents/types";
import { runAgent } from "@/lib/adk";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TrackRequest;
    if (!body.orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const result = await runAgent(`Track order ${body.orderId}`, {
      sessionData: { orderId: body.orderId },
    });

    const data = result.data ?? {};
    const trackingData = (typeof data.tracking_results === "string"
      ? JSON.parse(data.tracking_results)
      : data.tracking_results) as Record<string, unknown> | undefined;

    return NextResponse.json({
      order: trackingData as unknown as TrackResponse["order"],
      events: [],
    });
  } catch (error) {
    console.error("Track API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
