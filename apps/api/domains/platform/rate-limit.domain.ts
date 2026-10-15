// Fixed-window counters in app.rate_limits (C1), shared by the rateLimit middleware and domain rules (C7 submission
// guard, manage-link resend). Over the limit: RATE_LIMITED with details.retry_after_s (the error middleware sets
// Retry-After).
import { AppError } from '../../lib/errors.ts';
import PlatformDao from './platform.dao.ts';

/** One hit for `key` (a user id, an HMAC of an IP or device, or a record id) in the window that contains `now`. */
export async function consumeRateLimit(
	input: { name: string; key: string; limit: number; window_s: number },
	now: Date
): Promise<void> {
	const windowMs = input.window_s * 1000;
	const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
	const count = await PlatformDao.hitRateLimit({
		name: input.name,
		key: input.key,
		window_start: new Date(windowStart),
	});
	if (count > input.limit) {
		const retry_after_s = Math.max(1, Math.ceil((windowStart + windowMs - now.getTime()) / 1000));
		throw new AppError('RATE_LIMITED', 'Too many requests', { retry_after_s });
	}
}

export default { consumeRateLimit };
