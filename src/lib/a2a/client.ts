// ============================================================================
// A2A Client — Send tasks to agents via the A2A protocol
// ============================================================================

import type {
  A2AMessage,
  Task,
  TaskSendParams,
  MessagePart,
  TextPart,
  DataPart,
  Artifact,
} from "./types";
import { taskStore } from "./task-store";
import { agentCards } from "./agent-card";

// Agent executor registry — maps agent IDs to their run functions
type AgentExecutor = (task: Task) => Promise<{
  message: string;
  data?: Record<string, unknown>;
  artifacts?: Array<{ name: string; data: Record<string, unknown> }>;
}>;

const executors = new Map<string, AgentExecutor>();

export function registerExecutor(agentId: string, executor: AgentExecutor): void {
  executors.set(agentId, executor);
}

// ---------------------------------------------------------------------------
// Helper: build A2A messages
// ---------------------------------------------------------------------------

export function textMessage(role: "user" | "agent", text: string, meta?: Record<string, unknown>): A2AMessage {
  return { role, parts: [{ type: "text", text }], metadata: meta };
}

export function dataMessage(role: "user" | "agent", data: Record<string, unknown>, text?: string): A2AMessage {
  const parts: MessagePart[] = [];
  if (text) parts.push({ type: "text", text });
  parts.push({ type: "data", data });
  return { role, parts };
}

export function extractText(message: A2AMessage): string {
  return message.parts
    .filter((p): p is TextPart => p.type === "text")
    .map((p) => p.text)
    .join("\n");
}

export function extractData(message: A2AMessage): Record<string, unknown> | undefined {
  const part = message.parts.find((p): p is DataPart => p.type === "data");
  return part?.data;
}

// ---------------------------------------------------------------------------
// A2A Client: tasks/send
// ---------------------------------------------------------------------------

let idCounter = 0;
function generateTaskId(): string {
  return `task_${Date.now()}_${++idCounter}`;
}

export async function sendTask(
  agentId: string,
  message: A2AMessage,
  metadata?: Record<string, unknown>,
): Promise<Task> {
  const card = agentCards[agentId];
  if (!card) {
    throw new Error(`Agent "${agentId}" not found in registry`);
  }

  const executor = executors.get(agentId);
  if (!executor) {
    throw new Error(`No executor registered for agent "${agentId}"`);
  }

  const taskId = generateTaskId();
  const task = taskStore.create(taskId, agentId, message, metadata);

  // Transition: submitted → working
  taskStore.updateState(taskId, "working");

  try {
    const result = await executor(task);

    // Build agent response message
    const responseParts: MessagePart[] = [{ type: "text", text: result.message }];
    if (result.data) {
      responseParts.push({ type: "data", data: result.data });
    }
    const agentResponse: A2AMessage = { role: "agent", parts: responseParts };

    // Add artifacts if any
    if (result.artifacts) {
      for (const art of result.artifacts) {
        const artifact: Artifact = {
          name: art.name,
          parts: [{ type: "data", data: art.data }],
          index: 0,
        };
        taskStore.addArtifact(taskId, artifact);
      }
    }

    // Transition: working → completed
    taskStore.updateState(taskId, "completed", agentResponse);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Agent execution failed";
    taskStore.updateState(taskId, "failed", textMessage("agent", errorMsg));
  }

  return taskStore.get(taskId)!;
}

// ---------------------------------------------------------------------------
// A2A Client: tasks/get
// ---------------------------------------------------------------------------

export function getTask(taskId: string): Task | undefined {
  return taskStore.get(taskId);
}

// ---------------------------------------------------------------------------
// A2A Client: tasks/cancel
// ---------------------------------------------------------------------------

export function cancelTask(taskId: string): Task | undefined {
  const task = taskStore.get(taskId);
  if (!task) return undefined;
  if (task.state === "completed" || task.state === "failed") return task;
  return taskStore.updateState(taskId, "canceled");
}

// ---------------------------------------------------------------------------
// Params builder for external callers
// ---------------------------------------------------------------------------

export function buildTaskParams(
  text: string,
  data?: Record<string, unknown>,
): TaskSendParams {
  const parts: MessagePart[] = [{ type: "text", text }];
  if (data) parts.push({ type: "data", data });

  return {
    id: generateTaskId(),
    message: { role: "user", parts },
  };
}
