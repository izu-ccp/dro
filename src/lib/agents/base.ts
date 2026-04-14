// ============================================================================
// DRO Agent Framework — Base Agent
// ============================================================================

import type {
  AgentConfig,
  AgentContext,
  AgentResult,
  StreamEvent,
  ToolCall,
  ToolCallRecord,
  ToolResult,
} from "./types";
import { toolRegistry } from "../tools/registry";

let idCounter = 0;
function uid(): string {
  return `${Date.now()}-${++idCounter}`;
}

export abstract class BaseAgent {
  readonly name: string;
  readonly description: string;
  readonly tools: string[];
  readonly maxIterations: number;
  readonly timeoutMs: number;

  protected events: StreamEvent[] = [];
  protected toolHistory: ToolCallRecord[] = [];

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.description = config.description;
    this.tools = config.tools;
    this.maxIterations = config.maxIterations;
    this.timeoutMs = config.timeoutMs;
  }

  // ---- public entry point ------------------------------------------------

  async run(context: AgentContext): Promise<AgentResult> {
    this.events = [];
    this.toolHistory = [];

    this.emit("status", { status: "thinking", agent: this.name });

    try {
      const result = await this.execute(context);
      this.emit("status", { status: "done", agent: this.name });
      return {
        agentName: this.name,
        status: "success",
        message: result.message,
        data: result.data,
        toolCalls: this.toolHistory,
        streamEvents: this.events,
        delegateTo: result.delegateTo,
      };
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Unknown agent error";
      this.emit("error", { error: errorMsg, agent: this.name });
      return {
        agentName: this.name,
        status: "error",
        message: errorMsg,
        toolCalls: this.toolHistory,
        streamEvents: this.events,
      };
    }
  }

  // ---- abstract — each agent implements this -----------------------------

  protected abstract execute(
    context: AgentContext,
  ): Promise<{
    message: string;
    data?: unknown;
    delegateTo?: string;
  }>;

  // ---- tool execution ----------------------------------------------------

  protected async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ToolResult> {
    if (!this.tools.includes(toolName)) {
      return {
        success: false,
        data: null,
        error: `Agent "${this.name}" is not authorized to use tool "${toolName}"`,
        executionTimeMs: 0,
      };
    }

    const tool = toolRegistry.get(toolName);
    if (!tool) {
      return {
        success: false,
        data: null,
        error: `Tool "${toolName}" not found in registry`,
        executionTimeMs: 0,
      };
    }

    const call: ToolCall = { id: uid(), name: toolName, arguments: args };
    this.emit("tool_start", { tool: toolName, args, callId: call.id });

    const start = Date.now();
    let result: ToolResult;
    try {
      result = await tool.execute(args);
    } catch (err) {
      result = {
        success: false,
        data: null,
        error: err instanceof Error ? err.message : "Tool execution failed",
        executionTimeMs: Date.now() - start,
      };
    }

    this.emit("tool_end", {
      tool: toolName,
      callId: call.id,
      success: result.success,
      executionTimeMs: result.executionTimeMs,
    });

    this.toolHistory.push({
      tool: toolName,
      input: args,
      output: result,
      timestamp: Date.now(),
    });

    return result;
  }

  // ---- helpers -----------------------------------------------------------

  protected emit(
    type: StreamEvent["type"],
    data: unknown,
  ): void {
    this.events.push({
      type,
      agent: this.name,
      data,
      timestamp: Date.now(),
    });
  }

  protected think(thought: string): void {
    this.emit("thinking", { thought });
  }

  protected say(message: string): void {
    this.emit("message", { message });
  }
}
