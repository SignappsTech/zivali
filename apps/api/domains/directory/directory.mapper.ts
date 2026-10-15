// Directory rows → C18 DTOs (parsed with the shared schemas, so unknown columns never reach a client).
import type { z } from 'zod';

import { MunicipalityShelterList, ResponsibleShelter, Shelter, ShelterDetail, ShelterList } from '@zivali/validation';

import type { shelters } from '../../generated/client.ts';
import type { ResponsibleResult, ShelterListItem } from './directory.domain.ts';

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

function shelterFields(row: shelters) {
	return {
		slug: row.slug,
		name: row.name,
		address: row.address,
		postal_code: row.postal_code,
		city: row.city,
		lat: row.lat ?? undefined,
		lng: row.lng ?? undefined,
		phone: row.phone,
		phone_display: row.phone_display,
		email: row.email ?? undefined,
		website: row.website ?? undefined,
		opening_hours: row.opening_hours,
		source: row.source,
		verified_at: isoDate(row.verified_at),
	};
}

export function toShelterDto(row: shelters): z.infer<typeof Shelter> {
	return Shelter.parse(shelterFields(row));
}

export function toShelterDetailDto(
	row: shelters,
	municipalities: { slug: string; name: string }[]
): z.infer<typeof ShelterDetail> {
	return ShelterDetail.parse({ ...shelterFields(row), municipalities });
}

export function toShelterListDto(items: ShelterListItem[]): z.infer<typeof ShelterList> {
	return ShelterList.parse({
		items: items.map((item) => ({ ...item, verified_at: isoDate(item.verified_at) })),
	});
}

export function toMunicipalityListDto(
	items: { slug: string; name: string; shelter_slug: string | null }[]
): z.infer<typeof MunicipalityShelterList> {
	return MunicipalityShelterList.parse({ items });
}

export function toResponsibleDto(result: ResponsibleResult): z.infer<typeof ResponsibleShelter> {
	return ResponsibleShelter.parse(
		result.status === 'confirmed' ? { ...result, shelter: shelterFields(result.shelter) } : result
	);
}

export default { toShelterDto, toShelterDetailDto, toShelterListDto, toMunicipalityListDto, toResponsibleDto };
