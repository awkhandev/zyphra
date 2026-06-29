import { describe, it, expect } from "vitest";
import { scoreComplexity, selectModel, type RoutingConfig } from "@/lib/router";

// ── scoreComplexity ─────────────────────────────────────────────────────────
describe("lib/router — scoreComplexity", () => {
  it("returns 'simple' for empty messages", () => {
    expect(scoreComplexity({})).toBe("simple");
  });

  it("returns 'simple' for a short non-code prompt", () => {
    const body = {
      messages: [{ role: "user", content: "What is the capital of France?" }],
    };
    expect(scoreComplexity(body)).toBe("simple");
  });

  it("returns 'medium' for a longer non-code prompt (>100 tokens)", () => {
    // ~120 tokens: each word ~1.3 tokens, need 480+ chars for ~120 tokens
    const longText =
      "Explain in detail the history of computing technology ".repeat(8);
    const body = {
      messages: [{ role: "user", content: longText }],
    };
    expect(scoreComplexity(body)).toBe("medium");
  });

  it("returns 'complex' for a code-heavy prompt", () => {
    const body = {
      messages: [
        {
          role: "user",
          content:
            "```typescript\n" +
            "function hello() {\n" +
            "  return 'world'\n" +
            "}\n```\n" +
            "Can you explain this function?",
        },
      ],
    };
    expect(scoreComplexity(body)).toBe("complex");
  });

  it("returns 'complex' for very long prompts (>300 tokens)", () => {
    const longText = "This is a detailed explanation ".repeat(40);
    const body = {
      messages: [{ role: "user", content: longText }],
    };
    expect(scoreComplexity(body)).toBe("complex");
  });

  it("handles Anthropic-style content blocks", () => {
    const body = {
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "Hello, how are you?" }],
        },
      ],
    };
    expect(scoreComplexity(body)).toBe("simple");
  });

  it("returns 'simple' when messages is not an array", () => {
    const body = { messages: "not-an-array" };
    expect(scoreComplexity(body as unknown as Record<string, unknown>)).toBe(
      "simple",
    );
  });
});

// ── selectModel ─────────────────────────────────────────────────────────────
describe("lib/router — selectModel", () => {
  const anthropicConfig: RoutingConfig = {
    simple: "claude-haiku-4-5-20251001",
    medium: "claude-sonnet-4-6",
    complex: "passthrough",
  };

  it("routes simple prompts to haiku", () => {
    const result = selectModel("claude-sonnet-4-6", "simple", anthropicConfig);
    expect(result.model).toBe("claude-haiku-4-5-20251001");
    expect(result.tier).toBe("simple");
    expect(result.routed).toBe(true);
  });

  it("routes medium prompts to sonnet", () => {
    const result = selectModel(
      "claude-haiku-4-5-20251001",
      "medium",
      anthropicConfig,
    );
    expect(result.model).toBe("claude-sonnet-4-6");
    expect(result.tier).toBe("medium");
    expect(result.routed).toBe(true);
  });

  it("passes through complex prompts (keeps original model)", () => {
    const result = selectModel("claude-opus-4-8", "complex", anthropicConfig);
    expect(result.model).toBe("claude-opus-4-8");
    expect(result.originalModel).toBe("claude-opus-4-8");
    expect(result.tier).toBe("complex");
    expect(result.routed).toBe(false);
  });

  it("does not route when tier model matches requested model", () => {
    const result = selectModel(
      "claude-haiku-4-5-20251001",
      "simple",
      anthropicConfig,
    );
    expect(result.model).toBe("claude-haiku-4-5-20251001");
    expect(result.routed).toBe(false);
  });

  it("always sets originalModel to requestedModel", () => {
    const result = selectModel("gpt-4o", "medium", {
      simple: "gpt-4o-mini",
      medium: "gpt-4o",
      complex: "passthrough",
    });
    expect(result.originalModel).toBe("gpt-4o");
  });

  it("works with OpenAI-style config", () => {
    const openaiConfig: RoutingConfig = {
      simple: "gpt-4o-mini",
      medium: "gpt-4o",
      complex: "passthrough",
    };
    const result = selectModel("gpt-4o", "simple", openaiConfig);
    expect(result.model).toBe("gpt-4o-mini");
    expect(result.routed).toBe(true);
  });

  it("handles all-passthrough config", () => {
    const passthroughConfig: RoutingConfig = {
      simple: "passthrough",
      medium: "passthrough",
      complex: "passthrough",
    };
    const result = selectModel("claude-opus-4-8", "simple", passthroughConfig);
    expect(result.model).toBe("claude-opus-4-8");
    expect(result.routed).toBe(false);
  });
});
