// The ctx every domain function receives (ADR-020). Controllers build it from the request; jobs, seeders,
// scripts and tests use systemCtx(). Tasks add the fields they introduce (actor from auth, jobs, adapters, tx).
import type { Request } from 'express';

import { logger, type Logger } from './logger.ts';

export type Ctx = {
	logger: Logger;
};

export function requestCtx(req: Request): Ctx {
	return { logger: req.log };
}

export function systemCtx(): Ctx {
	return { logger };
}
