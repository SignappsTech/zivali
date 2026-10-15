// C18 §Admin: shelter directory editing (admin, aal2). Endpoints are injectEndpoints stubs for TASK-89.1: delete them
// when `gen:api` emits the generated ones. The two lists, the history, the delete and the JSON import body are
// requested in C18 (CHANGE from TASK-89.2); PUT and POST also carry `version` (conflict check) and `audit_note`.
import type { OpeningHours, Shelter } from './directory.ts';
import { api } from './rtk.ts';

export type DirectoryStatus = 'CONFIRMED' | 'UNCONFIRMED';
/** A closed row keeps its days and has empty times. */
export type AdminOpeningHours = OpeningHours & { closed?: boolean };
export type AdminShelter = Omit<Shelter, 'opening_hours'> & {
	email?: string | null;
	opening_hours: AdminOpeningHours[];
	version: number;
};
/** One per municipality (212); `shelter_slug: null` is not confirmed. */
export type AdminMunicipality = {
	slug: string;
	name: string;
	shelter_slug: string | null;
	status: DirectoryStatus;
	source: string;
	verified_at: string;
	version: number;
};
type Audited = { audit_note?: string };
/** `version` is the one the form loaded: a newer one on the server answers 409 CONFLICT (no `details.code`). */
export type ShelterInput = Omit<AdminShelter, 'slug' | 'version'> &
	Audited & {
		version?: number;
		/** Municipality slugs this shelter serves (assigned as CONFIRMED); left out = unchanged. */
		municipalities?: string[];
	};
export type MunicipalityShelterInput = Pick<AdminMunicipality, 'shelter_slug' | 'status' | 'source' | 'verified_at'> &
	Audited & { version: number };
export type DirectoryEntity = 'shelter' | 'municipality_shelter';
/** A directory_changes row, newest first; `data` is the full row after the change, `actor` null for seed or import. */
export type DirectoryChange = {
	id: string;
	version: number;
	data: Record<string, unknown>;
	source: string;
	actor: { display_name: string } | null;
	created_at: string;
};
/** Dry run or applied import: one entry per changed row (`before` null = new, `after` null = removed). */
export type DirectoryImportResult = {
	changes: {
		entity: DirectoryEntity;
		label: string;
		before: Record<string, unknown> | null;
		after: Record<string, unknown> | null;
	}[];
	/** `row` is the CSV line; `field` names the column that failed (name, phone, source, hours, …). */
	errors: { row: number; field: string }[];
};

const historyUrl = (entity: DirectoryEntity, key: string) =>
	`/v1/admin/${entity === 'shelter' ? 'shelters' : 'municipality-shelters'}/${encodeURIComponent(key)}/changes`;

export const directoryAdminApi = api.enhanceEndpoints({ addTagTypes: ['Directory'] }).injectEndpoints({
	endpoints: (build) => ({
		listAdminShelters: build.query<{ items: AdminShelter[] }, void>({
			query: () => '/v1/admin/shelters',
			providesTags: ['Directory'],
		}),
		listAdminMunicipalities: build.query<{ items: AdminMunicipality[] }, void>({
			query: () => '/v1/admin/municipality-shelters',
			providesTags: ['Directory'],
		}),
		createShelter: build.mutation<AdminShelter, ShelterInput>({
			query: (body) => ({ url: '/v1/admin/shelters', method: 'POST', body }),
			invalidatesTags: ['Directory'],
		}),
		updateShelter: build.mutation<AdminShelter, { slug: string; body: ShelterInput }>({
			query: ({ slug, body }) => ({ url: `/v1/admin/shelters/${encodeURIComponent(slug)}`, method: 'PUT', body }),
			invalidatesTags: ['Directory'],
		}),
		/** 409 CONFLICT with `details.code: 'HAS_ASSIGNMENTS'` while municipalities are assigned; the note is required. */
		deleteShelter: build.mutation<void, { slug: string; audit_note: string }>({
			query: ({ slug, audit_note }) => ({
				url: `/v1/admin/shelters/${encodeURIComponent(slug)}`,
				method: 'DELETE',
				body: { audit_note },
			}),
			invalidatesTags: ['Directory'],
		}),
		updateMunicipalityShelter: build.mutation<AdminMunicipality, { slug: string; body: MunicipalityShelterInput }>({
			query: ({ slug, body }) => ({
				url: `/v1/admin/municipality-shelters/${encodeURIComponent(slug)}`,
				method: 'PUT',
				body,
			}),
			invalidatesTags: ['Directory'],
		}),
		getDirectoryHistory: build.query<{ items: DirectoryChange[] }, { entity: DirectoryEntity; key: string }>({
			query: ({ entity, key }) => historyUrl(entity, key),
			providesTags: ['Directory'],
		}),
		/** Dry run: the diff, nothing written. Apply: the same diff in one transaction. */
		importDirectory: build.mutation<DirectoryImportResult, { csv: string; dryRun: boolean }>({
			query: ({ csv, dryRun }) => ({
				url: '/v1/admin/directory/import',
				method: 'POST',
				params: { dry_run: dryRun || undefined },
				body: { csv },
			}),
			invalidatesTags: (_result, _error, { dryRun }) => (dryRun ? [] : ['Directory']),
		}),
	}),
});

export const {
	useListAdminSheltersQuery,
	useListAdminMunicipalitiesQuery,
	useCreateShelterMutation,
	useUpdateShelterMutation,
	useDeleteShelterMutation,
	useUpdateMunicipalityShelterMutation,
	useGetDirectoryHistoryQuery,
	useImportDirectoryMutation,
} = directoryAdminApi;
