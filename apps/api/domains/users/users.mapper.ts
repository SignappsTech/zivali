// Own profile DTOs (C3): Profile for PATCH /v1/me, Me (+ email, email_verified, aal) for GET /v1/me.
import type { z } from 'zod';

import type { Aal } from '@zivali/types';
import { Me, Profile } from '@zivali/validation';

import type { MeRow } from './users.dao.ts';

export type ProfileDto = z.infer<typeof Profile>;
export type MeDto = z.infer<typeof Me>;

export function toProfileDto(row: MeRow): ProfileDto {
	const home = row.home_lat === null || row.home_lng === null ? null : { lat: row.home_lat, lng: row.home_lng };
	return Profile.parse({ ...row, home });
}

/** email_verified from auth.users.email_confirmed_at (never user_metadata); an anonymous finder has none. */
export function toMeDto(row: MeRow, aal: Aal): MeDto {
	return Me.parse({
		...toProfileDto(row),
		email: row.email,
		email_verified: !row.is_anonymous && row.email_verified,
		aal,
	});
}

export default { toProfileDto, toMeDto };
