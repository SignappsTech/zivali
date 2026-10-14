/** Reads one environment variable; empty values count as missing. Inject a fake in tests. */
export type Env = (name: string) => string | undefined;

export const env: Env = (name) => Deno.env.get(name) || undefined;

export function requireEnv(name: string, get: Env = env): string {
  const value = get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** `local` | `staging` | `production` */
export const appEnv = (get: Env = env): string => get('APP_ENV') ?? 'local';
