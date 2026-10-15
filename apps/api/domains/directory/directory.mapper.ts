// Directory rows → C18 DTOs (parsed with the shared schemas, so unknown columns never reach a client).
import type { z } from 'zod';

import {
	AdminMunicipalityShelter,
	AdminMunicipalityShelterList,
	AdminShelterList,
	DirectoryChangeList,
	DirectoryImportResult,
	MunicipalityShelterList,
	ResponsibleShelter,
	Shelter,
	ShelterDetail,
	ShelterList,
} from '@zivali/validation';

import type { directory_changes, shelters } from '../../generated/client.ts';
import type { ImportResult } from './directory-admin.domain.ts';
import type { AdminAssignmentRow } from './directory.dao.ts';
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

// Admin (C18 §Admin).

export function toAdminShelterListDto(
	rows: (shelters & { _count: { municipality_shelters: number } })[]
): z.infer<typeof AdminShelterList> {
	return AdminShelterList.parse({
		items: rows.map((row) => ({
			...shelterFields(row),
			id: row.id,
			active: row.active,
			version: row.version,
			municipality_count: row._count.municipality_shelters,
		})),
	});
}

const assignmentFields = (row: AdminAssignmentRow) => ({
	municipality: { slug: row.slug, name: row.name },
	shelter_slug: row.shelter_slug,
	status: row.status,
	source: row.source,
	verified_at: isoDate(row.verified_at),
	version: row.version,
});

export function toAdminAssignmentDto(row: AdminAssignmentRow): z.infer<typeof AdminMunicipalityShelter> {
	return AdminMunicipalityShelter.parse(assignmentFields(row));
}

export function toAdminAssignmentListDto(rows: AdminAssignmentRow[]): z.infer<typeof AdminMunicipalityShelterList> {
	return AdminMunicipalityShelterList.parse({ items: rows.map(assignmentFields) });
}

export function toDirectoryChangeListDto(rows: directory_changes[]): z.infer<typeof DirectoryChangeList> {
	return DirectoryChangeList.parse({
		items: rows.map((row) => ({
			version: row.version,
			data: row.data,
			source: row.source,
			actor_id: row.actor_id,
			audit_note: row.audit_note,
			created_at: row.created_at.toISOString(),
		})),
	});
}

export function toImportResultDto(result: ImportResult): z.infer<typeof DirectoryImportResult> {
	return DirectoryImportResult.parse(result);
}

export default {
	toShelterDto,
	toShelterDetailDto,
	toShelterListDto,
	toMunicipalityListDto,
	toResponsibleDto,
	toAdminShelterListDto,
	toAdminAssignmentDto,
	toAdminAssignmentListDto,
	toDirectoryChangeListDto,
	toImportResultDto,
};
