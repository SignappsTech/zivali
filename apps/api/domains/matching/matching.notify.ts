// notify.send variables for match_chip and match_suggested (C10), derived from the job's match_id and report_id only.
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
