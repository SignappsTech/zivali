import { env } from '@/lib/env';

// C15: liveness for nginx and the deploy smoke checks.
export function GET() {
	return Response.json({ ok: true, version: env.APP_VERSION, env: env.APP_ENV });
}
