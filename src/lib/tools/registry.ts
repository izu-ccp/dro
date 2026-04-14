// ============================================================================
// DRO Tool Framework — Tool Registry
// ============================================================================

import type { ToolDefinition } from "../agents/types";

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getByCategory(category: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(
      (t) => t.category === category,
    );
  }

  list(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  names(): string[] {
    return Array.from(this.tools.keys());
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }
}

export const toolRegistry = new ToolRegistry();
