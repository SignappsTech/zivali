// PublicStats DTO (C4 GET /v1/stats/public): the three published counts, nothing else.
import type { z } from 'zod';

import { PublicStats } from '@zivali/validation';

export type PublicStatsDto = z.infer<typeof PublicStats>;

export function toPublicStatsDto(stats: PublicStatsDto): PublicStatsDto {
	return PublicStats.parse(stats);
}

export default { toPublicStatsDto };
