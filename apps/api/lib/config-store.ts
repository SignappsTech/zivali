// app_config through a 60 s in-process cache (C1). Admin writes call invalidate(); other instances catch up within 60 s.
import ConfigDao from '../domains/config/config.dao.ts';

const TTL_MS = 60_000;

type Entry = { value: unknown; is_public: boolean };
let cache: { expires: number; rows: Promise<Map<string, Entry>> } | undefined;

function rows(): Promise<Map<string, Entry>> {
	if (!cache || cache.expires <= Date.now()) {
		const loading = ConfigDao.listConfig().then(
			(list) => new Map(list.map(({ key, value, is_public }) => [key, { value, is_public }]))
		);
		cache = { expires: Date.now() + TTL_MS, rows: loading };
		// A failed load is not cached; callers still see the rejection.
		loading.catch(() => {
			if (cache?.rows === loading) cache = undefined;
		});
	}
	return cache.rows;
}

/** The stored JSON value, or undefined when the key is not set. */
export async function get(key: string): Promise<unknown> {
	return (await rows()).get(key)?.value;
}

/** Keys with is_public = true, as { key: value } (GET /v1/config/public). */
export async function getPublic(): Promise<Record<string, unknown>> {
	const entries = [...(await rows())].filter(([, entry]) => entry.is_public);
	return Object.fromEntries(entries.map(([key, entry]) => [key, entry.value]));
}

export function invalidate(): void {
	cache = undefined;
}

export default { get, getPublic, invalidate };
