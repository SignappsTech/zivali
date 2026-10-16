// Public feature and content flags (C1): app_config keys with is_public = true, plus `payments.enabled`.
import { paymentsOn } from '../../adapters/payments/index.ts';
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';

/**
 * `payments.enabled` comes from the payments adapter, not app_config: false when PAYMENTS_PROVIDER=off, so the web
 * and the app hide the P15 asks without a flag of their own (C13 §Payments off).
 */
export async function getPublicConfig(_input: void, ctx: Ctx): Promise<Record<string, unknown>> {
	return { ...(await configStore.getPublic()), 'payments.enabled': paymentsOn(ctx.adapters.payments) };
}

export default { getPublicConfig };
