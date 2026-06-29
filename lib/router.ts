import { serviceSupabase } from "./supabase-server";

// ── Types ────────────────────────────────────────────────────────────────────
export type ComplexityTier = "simple" | "medium" | "complex";

export type RoutingConfig = {
  simple: string; // model for simple prompts (e.g. "claude-haiku-4-5-20251001")
  medium: string; // model for medium prompts (e.g. "claude-sonnet-4-6")
  complex: string; // "passthrough" = keep original, or a specific model
};

export type RoutingResult = {
  model: string; // final model to use
  originalModel: string; // what the user requested
  tier: ComplexityTier;
  routed: boolean; // true if routing changed the model
};

// ── Default routing configs ──────────────────────────────────────────────────
const ANTHROPIC_DEFAULT: RoutingConfig = {
  simple: "claude-haiku-4-5-20251001",
  medium: "claude-sonnet-4-6",
  complex: "passthrough",
};

const OPENAI_DEFAULT: RoutingConfig = {
  simple: "gpt-4o-mini",
  medium: "gpt-4o",
  complex: "passthrough",
};

// ── Complexity scoring ───────────────────────────────────────────────────────
// Estimates prompt complexity from the request body to decide which model tier
// to route to. Zero-dependency, runs in <1ms on typical prompts.

const CODE_SIGNALS = [
  "```",
  "function ",
  "class ",
  "import ",
  "export ",
  "const ",
  "let ",
  "var ",
  "SELECT ",
  "INSERT ",
  "UPDATE ",
  "DELETE ",
  "CREATE TABLE",
  "ALTER TABLE",
  "def ",
  "async ",
  "await ",
  "return ",
  "if (",
  "for (",
  "while (",
  "try {",
  "catch (",
  "switch (",
  ".then(",
  ".catch(",
  "interface ",
  "type ",
  "enum ",
  "struct ",
  "impl ",
  "fn ",
  "SELECT",
  "FROM",
  "WHERE",
  "JOIN",
  "GROUP BY",
];

export function scoreComplexity(body: Record<string, unknown>): ComplexityTier {
  // Extract all text content from messages
  const messages = body.messages as
    | Array<{ role?: string; content?: unknown }>
    | undefined;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return "simple";
  }

  // Flatten all message content into a single string
  let allText = "";
  for (const msg of messages) {
    if (typeof msg.content === "string") {
      allText += msg.content + " ";
    } else if (Array.isArray(msg.content)) {
      // Anthropic-style content blocks
      for (const block of msg.content) {
        if (typeof block === "object" && block !== null && "text" in block) {
          allText += (block as { text: string }).text + " ";
        } else if (typeof block === "string") {
          allText += block + " ";
        }
      }
    }
  }

  allText = allText.trim();

  // Estimate token count (rough: ~4 chars per token for English)
  const estimatedTokens = Math.ceil(allText.length / 4);

  // Check for code signals
  const lowerText = allText.toLowerCase();
  let codeSignalCount = 0;
  for (const signal of CODE_SIGNALS) {
    if (lowerText.includes(signal.toLowerCase())) {
      codeSignalCount++;
    }
  }

  const hasCode = codeSignalCount >= 2;

  // Classification logic
  if (hasCode || estimatedTokens > 300) {
    return "complex";
  }
  if (estimatedTokens > 100) {
    return "medium";
  }
  return "simple";
}

// ── Model selection ──────────────────────────────────────────────────────────
export function selectModel(
  requestedModel: string,
  complexity: ComplexityTier,
  config: RoutingConfig,
): RoutingResult {
  const tierModel = config[complexity];

  // "passthrough" means keep the original model
  if (tierModel === "passthrough") {
    return {
      model: requestedModel,
      originalModel: requestedModel,
      tier: complexity,
      routed: false,
    };
  }

  // Only route if the tier model is different from what was requested
  const routed = tierModel !== requestedModel;
  return {
    model: routed ? tierModel : requestedModel,
    originalModel: requestedModel,
    tier: complexity,
    routed,
  };
}

// ── Get routing config for workspace ─────────────────────────────────────────
export type WorkspaceRoutingConfig = {
  enabled: boolean;
  anthropicConfig: RoutingConfig;
  openaiConfig: RoutingConfig;
};

export async function getRoutingConfig(
  workspaceId: string,
): Promise<WorkspaceRoutingConfig> {
  try {
    const { data } = await serviceSupabase
      .from("workspaces")
      .select("routing_enabled, routing_config, routing_config_openai")
      .eq("id", workspaceId)
      .single();

    return {
      enabled: data?.routing_enabled ?? false,
      anthropicConfig: data?.routing_config ?? ANTHROPIC_DEFAULT,
      openaiConfig: data?.routing_config_openai ?? OPENAI_DEFAULT,
    };
  } catch {
    return {
      enabled: false,
      anthropicConfig: ANTHROPIC_DEFAULT,
      openaiConfig: OPENAI_DEFAULT,
    };
  }
}

// ── Main entry point for proxies ─────────────────────────────────────────────
export async function applyRouting(
  workspaceId: string,
  requestedModel: string,
  body: Record<string, unknown>,
  provider: "anthropic" | "openai",
): Promise<RoutingResult> {
  const config = await getRoutingConfig(workspaceId);

  if (!config.enabled) {
    return {
      model: requestedModel,
      originalModel: requestedModel,
      tier: "complex",
      routed: false,
    };
  }

  const routingConfig =
    provider === "openai" ? config.openaiConfig : config.anthropicConfig;
  const complexity = scoreComplexity(body);
  return selectModel(requestedModel, complexity, routingConfig);
}
