// Match rows → C8 MatchSuggestion. `other` is the other report's public view narrowed to MatchOther by the schema:
// no point, chip number or contact data of either side (FR-008 R-008.5).
import type { Locale } from '@zivali/types';
import { MatchList } from '@zivali/validation';

import { ReportsMapper, type ReportView } from '../reports/index.ts';
import type { MatchRow } from './matching.dao.ts';

export function toMatchList(items: { match: MatchRow; other: ReportView }[], locale: Locale) {
	return MatchList.parse({
		items: items.map(({ match, other }) => ({
			id: match.id,
			score: match.score.toNumber(),
			strength: match.strength,
			chip_match: match.chip_match,
			reasons: match.reasons,
			state: match.state,
			other: ReportsMapper.toPublicReport(other, locale),
		})),
	});
}

export default { toMatchList };
