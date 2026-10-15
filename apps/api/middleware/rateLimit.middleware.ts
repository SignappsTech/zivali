// rateLimit(name, { limit, window, key }) (C1): fixed window counters in app.rate_limits. The key is the user id,
// or an HMAC (RATE_SALT) of the IP (anonymous actors) or x-device-id (kind 'device' only). app_config `rate.<name>` = { limit, window } overrides the code
// defaults without a deploy (a window over 48 h or any non-positive value is ignored). Over the limit: 429
// RATE_LIMITED with Retry-After and details.retry_after_s.
import type { Request, RequestHandler } from 'express';
import { z } from 'zod';

import { consumeRateLimit } from '../domains/platform/index.ts';
import configStore from '../lib/config-store.ts';
import { requestHashes } from '../lib/ctx.ts';

export type RateLimitOptions = {
	limit: number;
	/** Window length in seconds. */
	window: number;
	/**
	 * 'user' counts anonymous finders per IP (each anonymous sign-in mints a new user id, and x-device-id is
	 * client-chosen and rotatable, so it never keys an anonymous actor) and signed-out callers per IP;
	 * 'device' (explicit opt-in) falls back to the IP without x-device-id.
	 */
	key: 'user' | 'ip' | 'device';
};

const MAX_WINDOW_S = 172_800;
const Override = z.object({
	limit: z.number().int().positive(),
	window: z.number().int().positive().max(MAX_WINDOW_S),
});

function rateKey(req: Request, kind: RateLimitOptions['key']): string {
	if (kind === 'user' && req.user && !req.user.is_anonymous) return req.user.user_id;
	const { ip_hash, device_hash } = requestHashes(req);
	if (kind === 'device' && device_hash) return device_hash;
	return ip_hash ?? 'unknown-ip';
}

export function rateLimit(name: string, options: RateLimitOptions): RequestHandler {
	return async (req, _res, next) => {
		const { limit, window } = Override.safeParse(await configStore.get(`rate.${name}`)).data ?? options;
		await consumeRateLimit({ name, key: rateKey(req, options.key), limit, window_s: window }, new Date());
		next();
	};
}

export default { rateLimit };
