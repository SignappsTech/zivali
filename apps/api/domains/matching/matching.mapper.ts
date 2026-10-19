// Match rows → C8 MatchSuggestion. `other` is the other report's public view narrowed to MatchOther by the schema:
// no point, chip number or contact data of either side (FR-008 R-008.5).
import type { Locale, MatchReason } from '@zivali/types';
import { MatchList } from '@zivali/validation';

import { ReportsMapper, type ReportView } from '../reports/index.ts';
import type { MatchRow } from './matching.dao.ts';

/** C8 §Visual similarity 8: with a visual reason, the other report's matched photo comes first. */
function matchedPhotoFirst(other: ReportView, reasons: MatchRow['reasons']): ReportView {
	const visual = (reasons as MatchReason[]).find((reason) => reason.code === 'visual');
	if (!visual) return other;
	const first = (photo: { id: string }) => (photo.id === visual.other_photo_id ? 0 : 1);
	const photos = [...other.report.photos].sort((a, b) => first(a) - first(b));
	return { ...other, report: { ...other.report, photos } };
}

export function toMatchList(items: { match: MatchRow; other: ReportView }[], locale: Locale) {
	return MatchList.parse({
		items: items.map(({ match, other }) => ({
			id: match.id,
			score: match.score.toNumber(),
			strength: match.strength,
			chip_match: match.chip_match,
			reasons: match.reasons,
			state: match.state,
			other: ReportsMapper.toPublicReport(matchedPhotoFirst(other, match.reasons), locale),
		})),
	});
}

export default { toMatchList };
