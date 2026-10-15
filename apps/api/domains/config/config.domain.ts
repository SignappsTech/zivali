// Public feature and content flags (C1): app_config keys with is_public = true.
import configStore from '../../lib/config-store.ts';
import type { Ctx } from '../../lib/ctx.ts';

export async function getPublicConfig(_input: void, _ctx: Ctx): Promise<Record<string, unknown>> {
	return configStore.getPublic();
}

export default { getPublicConfig };
