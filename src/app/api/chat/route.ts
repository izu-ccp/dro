// ============================================================================
// POST /api/chat — Conversational agent via Google ADK
// ============================================================================

import { NextResponse } from "next/server";
import type { ChatRequest, ChatResponse } from "@/lib/agents/types";
import { runAgent } from "@/lib/adk";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;
    if (!body.message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const result = await runAgent(body.message, {
      sessionId: body.conversationId,
      sessionData: {
        page: body.context?.page,
        productId: body.context?.productId,
        orderId: body.context?.orderId,
      },
    });

    const response: ChatResponse = {
      conversationId: result.sessionId,
      message: result.response,
      agent: "dro_orchestrator",
      data: result.data,
      events: [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
