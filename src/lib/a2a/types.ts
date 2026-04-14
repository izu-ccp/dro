// ============================================================================
// A2A (Agent-to-Agent) Protocol — Type Definitions
// Based on Google's A2A open protocol spec
// ============================================================================

// ---------------------------------------------------------------------------
// Agent Card — Discovery & Capabilities
// ---------------------------------------------------------------------------

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  protocolVersion: "0.2";
  skills: AgentSkill[];
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  defaultInputModes: InputMode[];
  defaultOutputModes: OutputMode[];
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples?: string[];
  inputModes?: InputMode[];
  outputModes?: OutputMode[];
}

export type InputMode = "text" | "data" | "file";
export type OutputMode = "text" | "data" | "file";

// ---------------------------------------------------------------------------
// Task — Unit of work with lifecycle
// ---------------------------------------------------------------------------

export type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "canceled";

export interface Task {
  id: string;
  agentId: string;
  state: TaskState;
  messages: A2AMessage[];
  artifacts: Artifact[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface TaskSendParams {
  id: string;
  message: A2AMessage;
  metadata?: Record<string, unknown>;
}

export interface TaskQueryParams {
  id: string;
  historyLength?: number;
}

// ---------------------------------------------------------------------------
// Message — Communication between agents
// ---------------------------------------------------------------------------

export interface A2AMessage {
  role: "user" | "agent";
  parts: MessagePart[];
  metadata?: Record<string, unknown>;
}

export type MessagePart = TextPart | DataPart | FilePart;

export interface TextPart {
  type: "text";
  text: string;
}

export interface DataPart {
  type: "data";
  data: Record<string, unknown>;
  mimeType?: string;
}

export interface FilePart {
  type: "file";
  file: {
    name: string;
    mimeType: string;
    bytes?: string; // base64
    uri?: string;
  };
}

// ---------------------------------------------------------------------------
// Artifact — Output produced by a task
// ---------------------------------------------------------------------------

export interface Artifact {
  name: string;
  description?: string;
  parts: MessagePart[];
  index: number;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Streaming — Task status updates via SSE
// ---------------------------------------------------------------------------

export interface TaskStatusUpdateEvent {
  type: "status";
  taskId: string;
  state: TaskState;
  message?: A2AMessage;
  timestamp: string;
}

export interface TaskArtifactUpdateEvent {
  type: "artifact";
  taskId: string;
  artifact: Artifact;
  timestamp: string;
}

export type TaskEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

// ---------------------------------------------------------------------------
// JSON-RPC Transport
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: A2AMethod;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export type A2AMethod =
  | "tasks/send"
  | "tasks/get"
  | "tasks/cancel"
  | "tasks/sendSubscribe";

// Standard error codes
export const A2A_ERRORS = {
  TASK_NOT_FOUND: { code: -32001, message: "Task not found" },
  TASK_NOT_CANCELABLE: { code: -32002, message: "Task cannot be canceled" },
  INVALID_PARAMS: { code: -32602, message: "Invalid params" },
  METHOD_NOT_FOUND: { code: -32601, message: "Method not found" },
  INTERNAL_ERROR: { code: -32603, message: "Internal error" },
  AGENT_UNAVAILABLE: { code: -32003, message: "Agent unavailable" },
} as const;
