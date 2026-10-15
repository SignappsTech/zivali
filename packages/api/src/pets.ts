// C4 pets (owner only) and C5 pet photo order. Stubs owned by TASK-16.3 (pets API) until apps/api/openapi.json has
// these routes; then `gen:api` generates them and this file is deleted.
import type { Pet, PetInput, PetList, SetPhotosInput, UpdatePetInput, Uuid } from '@zivali/types';

import { api } from './rtk.ts';

export const petsApi = api.enhanceEndpoints({ addTagTypes: ['Pets'] }).injectEndpoints({
	endpoints: (build) => ({
		listPets: build.query<PetList, void>({ query: () => '/v1/pets', providesTags: ['Pets'] }),
		getPet: build.query<Pet, { id: Uuid }>({ query: ({ id }) => `/v1/pets/${id}`, providesTags: ['Pets'] }),
		// CONFLICT with `details.code: 'PET_LIMIT'` over the free limit.
		createPet: build.mutation<Pet, PetInput>({
			query: (body) => ({ url: '/v1/pets', method: 'POST', body }),
			invalidatesTags: ['Pets'],
		}),
		updatePet: build.mutation<Pet, { id: Uuid; body: UpdatePetInput }>({
			query: ({ id, body }) => ({ url: `/v1/pets/${id}`, method: 'PATCH', body }),
			invalidatesTags: ['Pets'],
		}),
		deletePet: build.mutation<void, { id: Uuid }>({
			query: ({ id }) => ({ url: `/v1/pets/${id}`, method: 'DELETE' }),
			invalidatesTags: ['Pets'],
		}),
		archivePet: build.mutation<Pet, { id: Uuid }>({
			query: ({ id }) => ({ url: `/v1/pets/${id}/archive`, method: 'POST' }),
			invalidatesTags: ['Pets'],
		}),
		// C5, TASK-14.1: ordered photo ids, at most 5.
		setPetPhotos: build.mutation<void, { id: Uuid; body: SetPhotosInput }>({
			query: ({ id, body }) => ({ url: `/v1/pets/${id}/photos`, method: 'PUT', body }),
			invalidatesTags: ['Pets'],
		}),
	}),
});

export const {
	useListPetsQuery,
	useGetPetQuery,
	useCreatePetMutation,
	useUpdatePetMutation,
	useDeletePetMutation,
	useArchivePetMutation,
	useSetPetPhotosMutation,
} = petsApi;
