/**
 * Cloudflare Workers runtime bindings — consumed throughout the worker.
 * Secrets are set via `wrangler secret put`; everything else lives in wrangler.toml.
 */
export interface Env {
  /** Durable Object namespace for live game rooms */
  GAME_ROOM: DurableObjectNamespace;

  /** D1 SQLite database */
  DB: D1Database;

  /** R2 bucket for quiz images */
  IMAGES: R2Bucket;

  /** Static assets binding (built React SPA) */
  ASSETS: Fetcher;

  // ── Secrets ───────────────────────────────────────────────────────────────
  /** HS256 key for signing JWTs. Min 32 chars. */
  JWT_SECRET: string;

  /** Cloudflare Turnstile secret key (optional) */
  TURNSTILE_SECRET_KEY?: string;

  // ── Vars ──────────────────────────────────────────────────────────────────
  /** "development" | "production" */
  ENVIRONMENT: string;

  /** Base URL for R2 public images */
  R2_PUBLIC_URL?: string;
}
