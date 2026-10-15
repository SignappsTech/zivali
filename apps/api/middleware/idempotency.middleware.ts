// idempotency({ required }) (C1), last before the controller (after auth and the guards): `Idempotency-Key: <uuid>`
// replays the stored response to the same user for the same route and body for 24 h; another user, route or body gets
// 409 CONFLICT, as does a repeat while the first is still running. Bodies are always stored encrypted
// (IDEMPOTENCY_KEY), since some carry secrets (manage tokens). 5xx, 429, 401 and 403 answers are not stored, so the
// client can retry them with the same key.
import { createHash } from 'node:crypto';

import type { Request, RequestHandler, Response } from 'express';

import { PlatformDao } from '../domains/platform/index.ts';
import { IDEMPOTENCY_TTL_MS } from '../domains/platform/platform.dao.ts';
import { decryptJson, encryptJson } from '../lib/crypto.ts';
import { AppError } from '../lib/errors.ts';

// A row still in flight after this long belongs to a crashed request; it is freed for the retry.
const IN_FLIGHT_STALE_MS = 60_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const headerIssue = (message: string) =>
	new AppError('VALIDATION', message, undefined, [{ path: 'headers.idempotency-key', message }]);
const keep = (status: number) => status < 500 && ![401, 403, 429].includes(status);

/** JSON with sorted object keys, so the same body hashes the same whatever its key order. */
const canonical = (value: unknown): string => {
	if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
	if (value && typeof value === 'object')
		return `{${Object.keys(value)
			.sort()
			.map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
			.join(',')}}`;
	return JSON.stringify(value) ?? 'null';
};

type Stored = NonNullable<Awaited<ReturnType<typeof PlatformDao.getIdempotencyKey>>>;

/** Claims the key, or returns the completed row to replay. Throws CONFLICT for foreign or in-flight keys. */
async function claim(key: string, user_id: string, route: string): Promise<Stored | null> {
	for (let attempt = 0; attempt < 2; attempt++) {
		if (await PlatformDao.insertIdempotencyKey({ key, user_id, route })) return null;
		const row = await PlatformDao.getIdempotencyKey(key);
		if (!row) continue;
		const age = Date.now() - row.created_at.getTime();
		if (age > IDEMPOTENCY_TTL_MS || (row.status === null && age > IN_FLIGHT_STALE_MS)) {
			await PlatformDao.deleteIdempotencyKey(key, row.created_at);
			continue;
		}
		if (row.user_id !== user_id || row.route !== route)
			throw new AppError('CONFLICT', 'Idempotency-Key was already used for another request');
		if (row.status === null) throw new AppError('CONFLICT', 'A request with this Idempotency-Key is in progress');
		return row;
	}
	throw new AppError('CONFLICT', 'Idempotency-Key is busy, retry');
}

function replay(res: Response, row: Stored): void {
	res.set('Idempotent-Replayed', 'true').status(row.status!);
	if (typeof row.body === 'string') res.json(decryptJson(row.body));
	else res.end();
}

/** Stores the response before it is sent, so a retry can never miss it; failures free the key instead. */
function record(req: Request, res: Response, key: string): void {
	const send = res.json.bind(res);
	const log = (what: string) => (err: unknown) => req.log.error({ err }, `idempotency: ${what} failed`);
	let settled = false;
	res.json = ((body: unknown) => {
		if (settled) return send(body);
		// Serialised here, so an unserialisable body throws in the controller as plain res.json would.
		const sealed = keep(res.statusCode) ? encryptJson(body ?? null) : undefined;
		settled = true;
		const save = sealed
			? PlatformDao.completeIdempotencyKey(key, res.statusCode, sealed)
			: PlatformDao.deleteIdempotencyKey(key);
		void save
			.catch(log('storing the response'))
			.then(() => send(body))
			.catch(log('sending the response'));
		return res;
	}) as Response['json'];
	// Responses without a JSON body (204, redirects) are recorded once they finish.
	res.once('finish', () => {
		if (settled) return;
		settled = true;
		const save = keep(res.statusCode)
			? PlatformDao.completeIdempotencyKey(key, res.statusCode, null)
			: PlatformDao.deleteIdempotencyKey(key);
		save.catch(log('storing the response'));
	});
}

export function idempotency({ required = false }: { required?: boolean } = {}): RequestHandler {
	return async (req, res, next) => {
		const key = req.get('idempotency-key');
		if (!key) {
			if (required) throw headerIssue('Idempotency-Key header is required');
			return next();
		}
		if (!UUID.test(key)) throw headerIssue('Idempotency-Key must be a UUID');
		// The key belongs to a user (anonymous finders included); signed-out requests are not deduplicated.
		if (!req.user) return next();
		const path = (res.locals.route as string | undefined) ?? `${req.method} ${req.baseUrl}${req.path}`;
		// The body hash rides in the route column: the same key with another body is a mismatch (409).
		const route = `${path} ${createHash('sha256').update(canonical(req.body)).digest('hex')}`;
		const id = key.toLowerCase();
		const stored = await claim(id, req.user.user_id, route);
		if (stored) return replay(res, stored);
		record(req, res, id);
		next();
	};
}

export default { idempotency };
