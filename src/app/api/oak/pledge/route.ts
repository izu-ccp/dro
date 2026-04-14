// ============================================================================
// POST /api/oak/pledge — Trigger Oak Network pledge automation (streaming)
// ============================================================================

import { NextResponse } from "next/server";

interface PledgeRequest {
  projectId: string;
  title: string;
  amount: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PledgeRequest;

    if (!body.projectId && !body.title) {
      return NextResponse.json(
        { error: "projectId or title is required" },
        { status: 400 },
      );
    }

    const amount = body.amount || "0";

    // Build CLI command
    const cliArgs: string[] = [];
    if (body.projectId) cliArgs.push(`--projectId=${body.projectId}`);
    if (body.title) cliArgs.push(`--title="${body.title.replace(/"/g, '\\"')}"`);
    cliArgs.push(`--amount=${amount}`);

    const cmd = `node scripts/oak-pledge.js ${cliArgs.join(" ")}`;

    const { spawn } = await import("node:child_process");

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        const child = spawn("sh", ["-c", cmd], {
          cwd: process.cwd(),
          stdio: ["ignore", "pipe", "pipe"],
        });

        const sendLine = (line: string) => {
          if (!line.trim()) return;
          try {
            // Validate it's JSON before sending
            JSON.parse(line);
            controller.enqueue(encoder.encode(`data: ${line}\n\n`));
          } catch {
            // Non-JSON line — wrap it
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ status: "log", message: line })}\n\n`,
              ),
            );
          }
        };

        child.stdout.on("data", (chunk: Buffer) => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) sendLine(line);
        });

        child.stderr.on("data", (chunk: Buffer) => {
          const msg = chunk.toString().trim();
          if (msg) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ status: "log", message: msg })}\n\n`,
              ),
            );
          }
        });

        child.on("close", (code) => {
          if (buffer.trim()) sendLine(buffer);

          // Send a final "stream-end" event so the client knows we're done
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ status: "stream-end", exitCode: code })}\n\n`,
            ),
          );
          controller.close();
        });

        // Safety kill after 3 minutes
        const killTimer = setTimeout(() => {
          child.kill("SIGTERM");
        }, 180_000);

        child.on("exit", () => clearTimeout(killTimer));
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Oak pledge API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
