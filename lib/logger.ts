/**
 * Structured logger for Zyphra.
 *
 * Uses plain console methods — no worker threads, no Pino transport issues.
 * Outputs structured JSON in production, human-readable in development.
 * Automatically redacts PII and secrets from all log objects.
 */

// ── PII / Secret redaction ────────────────────────────────────────────────────
const SECRET_PATTERNS = [
  /sk-ant-/i,
  /sk-proj-/i,
  /zph_live_/i,
  /zph_test_/i,
  /Bearer\s+/i,
];

const SECRET_KEYS = [
  "apiKey",
  "openaiKey",
  "anthropicKey",
  "password",
  "token",
  "secret",
  "key_enc",
  "openai_key_enc",
  "authorization",
  "cookie",
];

function redactValue(key: string, value: unknown): unknown {
  if (typeof value !== "string") return value;
  // Redact known secret keys
  if (SECRET_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
    return value.length > 8
      ? `${value.slice(0, 4)}***${value.slice(-3)}`
      : "***";
  }
  // Redact values that match secret patterns (API keys, tokens)
  if (SECRET_PATTERNS.some((p) => p.test(value))) {
    return value.length > 12
      ? `${value.slice(0, 6)}***${value.slice(-4)}`
      : "***";
  }
  return value;
}

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out[k] = redact(v as Record<string, unknown>);
    } else if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === "object"
          ? redact(item as Record<string, unknown>)
          : redactValue(k, item),
      );
    } else {
      out[k] = redactValue(k, v);
    }
  }
  return out;
}

// ── Formatting ────────────────────────────────────────────────────────────────
const IS_DEV = process.env.NODE_ENV !== "production";

function formatMessage(
  level: string,
  context: string,
  msg: string,
  data?: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString().slice(11, 19);
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
  if (data && Object.keys(data).length > 0) {
    return `${prefix} ${msg} ${JSON.stringify(data)}`;
  }
  return `${prefix} ${msg}`;
}

function output(
  level: "info" | "warn" | "error" | "debug",
  context: string,
  msg: string,
  data?: Record<string, unknown>,
) {
  const cleaned = data ? redact(data) : undefined;
  if (IS_DEV) {
    const formatted = formatMessage(level, context, msg, cleaned);
    if (level === "error") console.error(formatted);
    else if (level === "warn") console.warn(formatted);
    else console.log(formatted);
  } else {
    // Production: structured JSON for log aggregation
    const entry: Record<string, unknown> = {
      level,
      time: Date.now(),
      context,
      msg,
    };
    if (cleaned) Object.assign(entry, cleaned);
    if (level === "error") console.error(JSON.stringify(entry));
    else if (level === "warn") console.warn(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  }
}

// ── Logger API ────────────────────────────────────────────────────────────────
export interface Logger {
  info: (msgOrData: string | Record<string, unknown>, msg?: string) => void;
  warn: (msgOrData: string | Record<string, unknown>, msg?: string) => void;
  error: (msgOrData: string | Record<string, unknown>, msg?: string) => void;
  debug: (msgOrData: string | Record<string, unknown>, msg?: string) => void;
  child: (bindings: Record<string, string>) => Logger;
}

function parseArgs(
  args: [string | Record<string, unknown>, string?],
): [string, Record<string, unknown>] {
  const [first, second] = args;
  if (typeof first === "string") {
    return [first, second ? { detail: second } : {}];
  }
  return [second || "no message", first];
}

/**
 * Create a child logger with context (and optional request ID).
 * Usage: const log = createLogger("keys", reqId)
 *        log.info({ workspaceId }, "Key created")
 */
export function createLogger(context: string, requestId?: string): Logger {
  const bindings: Record<string, string> = { context };
  if (requestId) bindings.requestId = requestId;

  function log(
    level: "info" | "warn" | "error" | "debug",
    args: [string | Record<string, unknown>, string?],
  ) {
    const [msg, data] = parseArgs(args);
    output(level, bindings.context, msg, { ...bindings, ...data });
  }

  return {
    info: (...args) => log("info", args),
    warn: (...args) => log("warn", args),
    error: (...args) => log("error", args),
    debug: (...args) => log("debug", args),
    child: (extraBindings) => {
      const merged = { ...bindings, ...extraBindings };
      function childLog(
        level: "info" | "warn" | "error" | "debug",
        args: [string | Record<string, unknown>, string?],
      ) {
        const [msg, data] = parseArgs(args);
        output(level, merged.context, msg, { ...merged, ...data });
      }
      return {
        info: (...args) => childLog("info", args),
        warn: (...args) => childLog("warn", args),
        error: (...args) => childLog("error", args),
        debug: (...args) => childLog("debug", args),
        child: (b: Record<string, string>) =>
          createLogger(merged.context, merged.requestId).child(b),
      };
    },
  };
}

// Default logger (no context)
export default createLogger("app");
