/**
 * Structured logger — emits JSON lines to stdout.
 * In production, ship these to Datadog / Loki / CloudWatch.
 * Every log carries: level, message, timestamp, and an arbitrary context object.
 * Callers must always pass traceId so logs can be correlated across services.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  traceId?: string;
  userId?: string;
  coupleId?: string;
  method?: string;
  path?: string;
  status?: number;
  duration_ms?: number;
  [key: string]: unknown;
}

function emit(level: LogLevel, message: string, ctx: LogContext = {}) {
  const entry = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...ctx,
  });

  if (level === "error" || level === "warn") {
    process.stderr.write(entry + "\n");
  } else {
    process.stdout.write(entry + "\n");
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => emit("debug", msg, ctx),
  info:  (msg: string, ctx?: LogContext) => emit("info",  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => emit("warn",  msg, ctx),
  error: (msg: string, ctx?: LogContext) => emit("error", msg, ctx),
};

/** Generate a short random trace ID for correlating a request's log lines. */
export function newTraceId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
