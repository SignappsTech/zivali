// Readiness: the database answers, plus how far the job queue is behind. Knows nothing about Express; the
// controller picks the HTTP status.
import { config } from '../../lib/config.ts';
import type { Ctx } from '../../lib/ctx.ts';
import HealthDao from './health.dao.ts';

export type Readiness = {
	ok: boolean;
	version: string;
	db: 'ok' | 'down';
	queue_lag_s: number | null;
};

export async function getReadiness(_input: void, ctx: Ctx): Promise<Readiness> {
	let db: Readiness['db'] = 'ok';
	try {
		await HealthDao.pingDatabase();
	} catch (err) {
		// Handled here: a failed check is a readiness answer, not an error response.
		ctx.logger.warn({ err }, 'readiness: database check failed');
		db = 'down';
	}
	// Lag = the worker is down or behind (ADR-022); unknown (null) when it cannot be read, never a failed check.
	let queue_lag_s: number | null = null;
	if (db === 'ok') {
		try {
			queue_lag_s = await HealthDao.queueLagSeconds();
		} catch (err) {
			ctx.logger.warn({ err }, 'readiness: queue lag check failed');
		}
	}
	return { ok: db === 'ok', version: config.APP_VERSION, db, queue_lag_s };
}

export default { getReadiness };
