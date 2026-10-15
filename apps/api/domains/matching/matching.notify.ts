// notify.send variables for match_chip and match_suggested (C10), derived from the job's match_id and report_id only,
// and for match_confirmed (below).
// Recipients are the lost report's managers; the other side's code is a short code, never a point or the chip number.
// Null (job dropped, not retried) when the match is rejected or closed, a report is gone or closed, or the recipient
// does not manage the lost report.
import type { Source } from '../notifications/sources.ts';
import MatchingDao from './matching.dao.ts';

export const matchVars: Source = async ({ match_id, report_id }, { user_id }) => {
	if (!match_id || !report_id) return null;
	const data = await MatchingDao.notificationData(match_id, report_id, user_id);
	if (!data) return null;
	const { match, lost, other } = data;
	return {
		match_id,
		lost_code: lost.short_code,
		other_code: other.short_code,
		other_type: other.type,
		strength: match.strength,
		pet_name: lost.name,
		species: lost.species,
	};
};

/**
 * match_confirmed for a manager of the other (found or sighted) report: their report's code, type and species and the
 * match conversation from the job's match_id and thread_id. Null when the match is no longer confirmed with that
 * conversation, the recipient does not manage the other report, or it is closed.
 */
export const matchConfirmedVars: Source = async ({ match_id, thread_id }, { user_id }) => {
	if (!match_id || !thread_id) return null;
	const other = await MatchingDao.confirmedData(match_id, thread_id, user_id);
	if (!other) return null;
	return {
		conversation_id: thread_id,
		report_code: other.short_code,
		species: other.species,
		report_type: other.type,
	};
};
