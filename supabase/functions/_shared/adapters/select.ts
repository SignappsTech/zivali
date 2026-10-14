import type { Env } from '../env.ts';
import { createLogger } from '../log.ts';

/**
 * Provider named by `variable` (e.g. `EMAIL_PROVIDER=brevo`). Falls back to `mock` when the variable is
 * unset or when a credential the named provider needs is missing, so local dev and CI stay offline (P-6).
 * An unknown provider name is a configuration error and throws.
 */
export function pickProvider(variable: string, credentials: Record<string, string[]>, get: Env): string {
  const name = get(variable)?.trim().toLowerCase() || 'mock';
  if (name === 'mock') return name;
  const needed = credentials[name];
  if (!needed) throw new Error(`${variable}: unknown provider "${name}"`);
  const missing = needed.filter((key) => !get(key));
  if (missing.length === 0) return name;
  createLogger({ fn: 'adapters' }).warn('credentials missing, using mock', {
    variable,
    provider: name,
    missing: missing.join(','),
  });
  return 'mock';
}

/** Thrown while a real provider's adapter is still owned by a later task. */
export function notImplemented(variable: string, provider: string): never {
  throw new Error(`${variable}=${provider}: adapter not implemented yet`);
}
