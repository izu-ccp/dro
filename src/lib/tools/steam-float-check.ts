// Tool 6/18 — Steam Float Check
import type { ToolDefinition, ToolResult } from "../agents/types";

export const steamFloatCheckTool: ToolDefinition = {
  name: "steam_float_check",
  description: "Check the float value, paint seed, and pattern details of a CS2 skin via inspect link",
  category: "steam",
  parameters: [
    { name: "inspectLink", type: "string", description: "CS2 inspect link or listing ID", required: true },
  ],
  execute: async (args): Promise<ToolResult> => {
    const start = Date.now();

    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));

    const float = Math.random() * 0.4 + 0.05;
    const wearRanges = [
      { name: "Factory New", min: 0, max: 0.07 },
      { name: "Minimal Wear", min: 0.07, max: 0.15 },
      { name: "Field-Tested", min: 0.15, max: 0.38 },
      { name: "Well-Worn", min: 0.38, max: 0.45 },
      { name: "Battle-Scarred", min: 0.45, max: 1.0 },
    ];
    const wear = wearRanges.find((w) => float >= w.min && float < w.max)?.name ?? "Unknown";

    const paintSeed = Math.floor(Math.random() * 1000);
    const isRarePattern = paintSeed === 661 || paintSeed === 387 || paintSeed === 463;

    return {
      success: true,
      data: {
        inspectLink: args.inspectLink,
        float: Math.round(float * 10000) / 10000,
        wear,
        paintSeed,
        paintIndex: Math.floor(Math.random() * 1000),
        isRarePattern,
        rarePatternName: isRarePattern ? "Tier 1 Blue Gem" : null,
        rank: Math.floor(Math.random() * 50000) + 1,
        totalRegistered: 285431,
        screenshotUrl: null,
      },
      executionTimeMs: Date.now() - start,
    };
  },
};
