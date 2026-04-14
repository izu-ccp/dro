// ============================================================================
// POST /api/a2a — A2A-compatible endpoint via Google ADK
// GET  /api/a2a — Agent discovery
// ============================================================================

import { NextResponse } from "next/server";
import { runAgent, rootAgent } from "@/lib/adk";

interface JsonRpcRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as JsonRpcRequest;

    if (body.jsonrpc !== "2.0" || !body.method) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: body.id ?? null, error: { code: -32600, message: "Invalid JSON-RPC request" } },
        { status: 400 },
      );
    }

    if (body.method === "tasks/send") {
      const params = body.params ?? {};
      const message = params.message as { parts?: Array<{ text?: string }> } | undefined;
      const text = message?.parts?.find((p) => p.text)?.text ?? "";

      const result = await runAgent(text, {
        sessionData: params.metadata as Record<string, unknown>,
      });

      return NextResponse.json({
        jsonrpc: "2.0",
        id: body.id,
        result: {
          id: result.sessionId,
          state: "completed",
          message: result.response,
          data: result.data,
        },
      });
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id: body.id,
      error: { code: -32601, message: `Method "${body.method}" not supported` },
    });
  } catch (error) {
    console.error("A2A error:", error);
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32603, message: "Internal error" } },
      { status: 500 },
    );
  }
}

// GET /api/a2a — Returns agent cards for discovery
export async function GET() {
  const agents = rootAgent.subAgents.map((agent) => ({
    name: agent.name,
    description: (agent as { description?: string }).description ?? "",
  }));

  return NextResponse.json({
    protocol: "Google ADK",
    framework: "@google/adk",
    agents: [
      { name: rootAgent.name, description: "Root orchestrator agent", subAgents: agents },
      ...agents,
    ],
  });
}
