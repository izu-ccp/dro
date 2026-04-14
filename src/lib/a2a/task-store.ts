// ============================================================================
// A2A Task Store — In-memory task storage with lifecycle management
// ============================================================================

import type { Task, TaskState, A2AMessage, Artifact, TaskEvent } from "./types";

type TaskListener = (event: TaskEvent) => void;

class TaskStore {
  private tasks = new Map<string, Task>();
  private listeners = new Map<string, Set<TaskListener>>();

  create(id: string, agentId: string, message: A2AMessage, metadata?: Record<string, unknown>): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id,
      agentId,
      state: "submitted",
      messages: [message],
      artifacts: [],
      metadata: metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    return task;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  updateState(id: string, state: TaskState, agentMessage?: A2AMessage): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    task.state = state;
    task.updatedAt = new Date().toISOString();
    if (agentMessage) {
      task.messages.push(agentMessage);
    }

    this.emit(id, {
      type: "status",
      taskId: id,
      state,
      message: agentMessage,
      timestamp: task.updatedAt,
    });

    return task;
  }

  addArtifact(id: string, artifact: Artifact): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) return undefined;

    artifact.index = task.artifacts.length;
    task.artifacts.push(artifact);
    task.updatedAt = new Date().toISOString();

    this.emit(id, {
      type: "artifact",
      taskId: id,
      artifact,
      timestamp: task.updatedAt,
    });

    return task;
  }

  subscribe(taskId: string, listener: TaskListener): () => void {
    if (!this.listeners.has(taskId)) {
      this.listeners.set(taskId, new Set());
    }
    this.listeners.get(taskId)!.add(listener);

    return () => {
      this.listeners.get(taskId)?.delete(listener);
    };
  }

  private emit(taskId: string, event: TaskEvent): void {
    const subs = this.listeners.get(taskId);
    if (subs) {
      for (const listener of subs) {
        listener(event);
      }
    }
  }

  list(): Task[] {
    return Array.from(this.tasks.values());
  }
}

export const taskStore = new TaskStore();
