// Pet rows → the owner-only Pet DTO (C4), parsed with the shared schema. Photo thumbs come resolved from the domain.
import type { z } from 'zod';

import { Pet } from '@zivali/validation';

import type { PetView } from './pets.domain.ts';

export type PetDto = z.infer<typeof Pet>;

export function toPetDto({ pet, photos }: PetView): PetDto {
	return Pet.parse({
		id: pet.id,
		species: pet.species,
		name: pet.name,
		breed_codes: pet.breed_codes,
		colours: pet.colours,
		pattern: pet.pattern,
		size: pet.size,
		sex: pet.sex,
		birth_year: pet.birth_year,
		chip_number: pet.chip_number,
		chip_status: pet.chip_status,
		chip_registered_crhz: pet.chip_registered_crhz,
		ear_tip: pet.ear_tip,
		lifestyle: pet.lifestyle,
		collar: pet.collar,
		notes: pet.notes,
		photos,
		archived_at: pet.archived_at?.toISOString() ?? null,
		created_at: pet.created_at.toISOString(),
		updated_at: pet.updated_at.toISOString(),
	});
}

export default { toPetDto };
