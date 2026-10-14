import type { ZodType } from 'zod';
import type { Logger } from './log.ts';

/** Stable error codes (C1 §RPC conventions); clients map them to `errors.<code>` i18n keys. */
export type ErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'GONE'
  | 'FORBIDDEN'
  | 'UNVERIFIED_EMAIL'
  | 'RATE_LIMITED'
  | 'CAPTCHA_FAILED'
  | 'CONFLICT'
  | 'DUPLICATE_OPEN_REPORT'
  | 'MIN_AMOUNT'
  | 'LIVE_MODE_FORBIDDEN'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  CAPTCHA_FAILED: 400,
  MIN_AMOUNT: 400,
  FORBIDDEN: 403,
  UNVERIFIED_EMAIL: 403,
  LIVE_MODE_FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  DUPLICATE_OPEN_REPORT: 409,
  GONE: 410,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/** An expected failure: returned to the client as `{ error: { code, message, details } }`. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details: Record<string, unknown> | null = null,
    readonly status: number = STATUS[code],
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

/** AppError → its status and body; anything else is logged and returned as INTERNAL without details. */
export function errorResponse(err: unknown, log: Logger, headers: Record<string, string> = {}): Response {
  if (err instanceof AppError) {
    return json({ error: { code: err.code, message: err.message, details: err.details } }, err.status, headers);
  }
  log.error('unexpected error', { error: err instanceof Error ? err.message : String(err) });
  return json({ error: { code: 'INTERNAL', message: 'Internal error', details: null } }, 500, headers);
}

/** Validates input with a zod schema; failures throw VALIDATION with the issue paths. */
export function parseInput<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const issues = result.error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message }));
  throw new AppError('VALIDATION', 'Invalid input', { issues });
}
