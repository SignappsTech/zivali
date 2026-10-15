// notify.send variables for report_hidden (C10), from the job's report_id only: the report's code and type. Null (job
// dropped, not retried) once the report is visible again or the recipient no longer manages it.
import type { Source } from '../notifications/sources.ts';
import AbuseDao from './abuse.dao.ts';

export const reportHiddenVars: Source = async ({ report_id }, { user_id }) => {
	if (!report_id) return null;
	const report = await AbuseDao.hiddenReport(report_id, user_id);
	return report && { report_code: report.short_code, report_type: report.type };
};
