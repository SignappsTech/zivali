// Domain result → response DTO, parsed with the DTO schema so nothing unlisted leaves the API.
// ponytail: the schema moves to @zivali/validation (health.schema.ts) once that package exists (TASK-6.5).
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
