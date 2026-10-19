// Public feature and content flags (C1): app_config keys with is_public = true, plus `payments.enabled`.
import { aiOn } from '../../adapters/ai/index.ts';
import { paymentsOn } from '../../adapters/payments/index.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';
import { AiDomain } from '../ai/index.ts';

/**
 * `payments.enabled` comes from the payments adapter, not app_config: false when PAYMENTS_PROVIDER=off, so the web
 * and the app hide the P15 asks without a flag of their own (C13 §Payments off).
 */
export async function getPublicConfig(_input: void, ctx: Ctx): Promise<Record<string, unknown>> {
	const flags = await configStore.getPublic();
	return {
		...flags,
		'payments.enabled': paymentsOn(ctx.adapters.payments),
		// Like payments: app_config ai.enabled only counts while the AI adapter is on (C19) and a valid ai.photos_since
		// lets new photos through (TASK-40.11), so clients do not poll for nothing.
		...('ai.enabled' in flags && {
			'ai.enabled':
				flags['ai.enabled'] === true && aiOn(ctx.adapters.ai) && (await AiDomain.photosSince()) !== null,
		}),
	};
}

export default { getPublicConfig };
