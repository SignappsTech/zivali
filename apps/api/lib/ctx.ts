// The ctx every domain function receives (ADR-020). Controllers build it with userCtx(req); jobs, seeders, scripts
// and tests use systemCtx() or userCtx(actor). Domains read who is acting from ctx.actor, never from the request.
import type { Request } from 'express';

import { LOCALES, type Aal, type Locale, type UserRole } from '@zivali/types';

import { adapters, type Adapters } from '../adapters/index.ts';
import type { Prisma } from '../prisma/prisma.ts';
import { hashKey } from './crypto.ts';
import { logger, type Logger } from './logger.ts';

/** Who is calling, set on req.user by authMiddleware/optionalAuth. role and locale come from app.profiles (C3). */
export type Actor = {
	user_id: string;
	role: UserRole;
	is_anonymous: boolean;
	aal: Aal;
	email_verified: boolean;
	locale: Locale;
};

declare module 'http' {
	interface IncomingMessage {
		user?: Actor;
	}
}

export type Jobs = {
	send(queue: string, data: object, options?: { tx?: Prisma.TransactionClient }): Promise<string | null>;
};

// ponytail: placeholder until TASK-6.3 (lib/jobs.ts, pg-boss) plugs in the real sender; fails loudly, never drops a job.
const jobs: Jobs = {
	send: async (queue) => {
		throw new Error(`job queue not available yet (TASK-6.3): ${queue}`);
	},
};

export type Ctx = {
	actor: Actor | null;
	/** Accept-Language (sl|en), else the actor's profile locale, else sl. */
	locale: Locale;
	/** HMAC (RATE_SALT) of the client IP and of x-device-id; raw values are never stored (C1). */
	ip_hash?: string;
	device_hash?: string;
	tx?: Prisma.TransactionClient;
	now: Date;
	jobs: Jobs;
	logger: Logger;
	adapters: Adapters;
};

const DEVICE_ID_MAX = 128;

export function requestHashes(req: Request): Pick<Ctx, 'ip_hash' | 'device_hash'> {
	const device = req.get('x-device-id');
	return {
		ip_hash: req.ip ? hashKey(`ip:${req.ip}`) : undefined,
		device_hash: device && device.length <= DEVICE_ID_MAX ? hashKey(`device:${device}`) : undefined,
	};
}

export function systemCtx(overrides: Partial<Ctx> = {}): Ctx {
	return { actor: null, locale: 'sl', now: new Date(), jobs, logger, adapters, ...overrides };
}

/** From a request (controllers) or an actor (scripts, tests). */
export function userCtx(source: Request | Actor): Ctx {
	if (!('headers' in source)) return systemCtx({ actor: source, locale: source.locale });
	const actor = source.user ?? null;
	const header = source.get('accept-language') ? source.acceptsLanguages(...LOCALES) : false;
	return systemCtx({
		actor,
		locale: (header || actor?.locale || 'sl') as Locale,
		...requestHashes(source),
		logger: source.log,
	});
}
