// AlertSubscription DTO (C10): the request fields plus daily_cap and timestamps; the centre is the stored, coarsened one.
import type { z } from 'zod';

import { AlertSubscription } from '@zivali/validation';

import type { SubscriptionRow } from './alerts.dao.ts';

export type AlertSubscriptionDto = z.infer<typeof AlertSubscription>;

export function toSubscriptionDto(row: SubscriptionRow): AlertSubscriptionDto {
	return AlertSubscription.parse({
		center: { lat: row.lat, lng: row.lng },
		radius_km: row.radius_km,
		species: row.species,
		paused: row.paused,
		daily_cap: row.daily_cap,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	});
}

export default { toSubscriptionDto };
