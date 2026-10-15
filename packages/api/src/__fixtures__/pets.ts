// C4 pets (owner view); the contract has no example, so this follows the Pet type.
import type { Pet, PetList } from '@zivali/types';

import type { ApiErrorBody } from '../client.ts';

export const pet: Pet = {
	id: '3f2a9c1e-7b4d-4e6a-8c2f-1d9e5b7a3c00',
	species: 'dog',
	name: 'Runo',
	breed_codes: ['dog.labrador_retriever'],
	colours: ['golden'],
	pattern: 'solid',
	size: 'l',
	sex: 'male',
	birth_year: 2021,
	chip_number: '705000000123456',
	chip_status: 'valid',
	chip_registered_crhz: 'yes',
	ear_tip: null,
	lifestyle: null,
	collar: 'Rdeča ovratnica',
	notes: null,
	photos: [{ id: '9b0e2c4a-1f3d-4b5e-8a7c-6d2e1f0a9b00', thumb_url: 'https://media.zivali.test/p/9b0e/thumb.webp' }],
	archived_at: null,
	created_at: '2026-10-01T08:00:00Z',
	updated_at: '2026-10-01T08:00:00Z',
};

export const pets: PetList = { items: [pet] };

export const petLimit: ApiErrorBody = {
	error: { code: 'CONFLICT', message: 'Pet limit reached', details: { code: 'PET_LIMIT', limit: 2 } },
};
