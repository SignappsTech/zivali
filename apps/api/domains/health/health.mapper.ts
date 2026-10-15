// Domain result → response DTO, parsed with the DTO schema so nothing unlisted leaves the API.
// An ops-only DTO, so its schema stays here; DTOs shared with web and mobile live in @zivali/validation.
import { z } from 'zod';

import type { Readiness } from './health.domain.ts';

export const HealthReadySchema = z
	.object({
		ok: z.boolean(),
		version: z.string(),
		db: z.enum(['ok', 'down']),
		queue_lag_s: z.number().nullable(),
	})
	.meta({ id: 'HealthReady' });

export type HealthReadyDto = z.infer<typeof HealthReadySchema>;

export function toReadyDto(readiness: Readiness): HealthReadyDto {
	return HealthReadySchema.parse(readiness);
}

export default { toReadyDto };
