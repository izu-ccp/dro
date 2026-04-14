// ============================================================================
// DRO Agent Framework — Agent Registry
// ============================================================================

import type { BaseAgent } from "./base";

class AgentRegistry {
  private agents = new Map<string, BaseAgent>();

  register(agent: BaseAgent): void {
    this.agents.set(agent.name, agent);
  }

  get(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }

  list(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  names(): string[] {
    return Array.from(this.agents.keys());
  }

  has(name: string): boolean {
    return this.agents.has(name);
  }
}

export const agentRegistry = new AgentRegistry();
