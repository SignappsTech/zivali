import { appEnv, env } from '../_shared/env.ts';
import { json } from '../_shared/errors.ts';
import { createLogger } from '../_shared/log.ts';

// Public probe (verify_jwt = false in config.toml) for deploy smoke tests and uptime checks.
Deno.serve(() => {
  const started = performance.now();
  const res = json({ ok: true, version: env('APP_VERSION') ?? 'dev', env: appEnv() });
  createLogger({ fn: 'health', request_id: crypto.randomUUID() })
    .info('ok', { status: res.status, duration_ms: Math.round(performance.now() - started) });
  return res;
});
