import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AI_MODEL = "claude-sonnet-4-6";

// Scans charged per analysis type
export const SCAN_COSTS = {
  ad:   3,
  shop: 10,
} as const;

// Plan requirements
export const PLAN_REQUIREMENTS = {
  ad:   ["starter", "premium", "business"],
  shop: ["premium", "business"],
} as const;
