// ============================================================================
// A2A Server — JSON-RPC handler for incoming A2A requests
// ============================================================================

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  TaskSendParams,
  TaskQueryParams,
} from "./types";
import { A2A_ERRORS } from "./types";
import { sendTask, getTask, cancelTask, textMessage, dataMessage } from "./client";

export async function handleA2ARequest(body: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { id, method, params } = body;

  try {
    switch (method) {
      case "tasks/send": {
        const p = params as TaskSendParams & { agentId?: string };
        if (!p?.message) {
          return { jsonrpc: "2.0", id, error: A2A_ERRORS.INVALID_PARAMS };
        }
        const agentId = p.agentId ?? "orchestrator";
        const task = await sendTask(agentId, p.message, p.metadata);
        return { jsonrpc: "2.0", id, result: task };
      }

      case "tasks/get": {
        const p = params as TaskQueryParams;
        if (!p?.id) {
          return { jsonrpc: "2.0", id, error: A2A_ERRORS.INVALID_PARAMS };
        }
        const task = getTask(p.id);
        if (!task) {
          return { jsonrpc: "2.0", id, error: A2A_ERRORS.TASK_NOT_FOUND };
        }
        return { jsonrpc: "2.0", id, result: task };
      }

      case "tasks/cancel": {
        const p = params as TaskQueryParams;
        if (!p?.id) {
          return { jsonrpc: "2.0", id, error: A2A_ERRORS.INVALID_PARAMS };
        }
        const task = cancelTask(p.id);
        if (!task) {
          return { jsonrpc: "2.0", id, error: A2A_ERRORS.TASK_NOT_FOUND };
        }
        return { jsonrpc: "2.0", id, result: task };
      }

      case "tasks/sendSubscribe": {
        // SSE streaming — handled at the route level, not here
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: "Use the SSE endpoint for streaming" },
        };
      }

      default:
        return { jsonrpc: "2.0", id, error: A2A_ERRORS.METHOD_NOT_FOUND };
    }
  } catch (err) {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code: A2A_ERRORS.INTERNAL_ERROR.code,
        message: err instanceof Error ? err.message : "Internal error",
      },
    };
  }
}

// Re-export helpers for convenience
export { textMessage, dataMessage };
