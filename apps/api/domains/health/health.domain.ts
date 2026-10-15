// Readiness: the database answers. Knows nothing about Express; the controller picks the HTTP status.
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
	// queue_lag_s comes from pg-boss once the worker task (TASK-6.3) adds it.
	return { ok: db === 'ok', version: config.APP_VERSION, db, queue_lag_s: null };
}

export default { getReadiness };
