import { useLocalSearchParams } from 'expo-router';

import { SPECIES, type Species } from '@zivali/types';
import { FoundFlow } from '@/components/report-found/found-flow';

type Params = { type?: string; linked_report_id?: string; code?: string; species?: string };

/**
 * C15 `report/found`: the P7 found flow; `?type=sighted` the same flow entered as a sighting, and with
 * `linked_report_id` (P9 "Sporoči opažanje", plus the listing's `code` and `species`) the short linked sighting flow.
 */
export default function ReportFoundScreen() {
	const { type, linked_report_id: id, code, species } = useLocalSearchParams<Params>();
	const known = SPECIES.includes(species as Species) ? (species as Species) : undefined;
	return (
		<FoundFlow
			entry={type === 'sighted' ? 'sighted' : 'found'}
			linked={type === 'sighted' && id ? { id, code: code || undefined, species: known } : undefined}
		/>
	);
}
