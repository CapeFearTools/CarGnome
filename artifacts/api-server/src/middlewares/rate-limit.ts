import type { RequestHandler } from "express";

interface RateLimitOptions {
  /** Length of the counting window. */
  windowMs: number;
  /** Requests allowed per client IP within one window. */
  max: number;
  /** Error message returned with the 429 response. */
  message: string;
}

/**
 * Minimal fixed-window rate limiter keyed by client IP. Counts live in this
 * process's memory, so each server instance limits independently — enough to
 * blunt form spam without extra infrastructure.
 */
export function rateLimit({ windowMs, max, message }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  // Drop expired entries so the map can't grow without bound.
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  cleanup.unref();

  return (req, res, next) => {
    const key = req.ip ?? "unknown";
    const now = Date.now();

    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}
