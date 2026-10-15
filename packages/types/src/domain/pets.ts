// C4 pets: GET/POST /v1/pets, GET/PATCH/DELETE /v1/pets/:id, POST /v1/pets/:id/archive (owner only).
import type { BreedCode } from './breeds.ts';
import type { IsoDateTime, Uuid } from './common.ts';
import type { ChipRegisteredCrhz, ChipStatus, Colour, Lifestyle, Pattern, Sex, Size, Species } from './enums.ts';

/** POST /v1/pets; PATCH sends a partial. Optional fields accept null to clear them. */
export type PetInput = {
	species: Species;
	name: string;
	breed_codes?: BreedCode[];
	colours?: Colour[];
	pattern?: Pattern | null;
	size?: Size | null;
	sex?: Sex | null;
	birth_year?: number | null;
	/** raw input, normalised by the API with normalizeChip() */
	chip?: string | null;
	/** FR-002 R-002.5 */
	chip_registered_crhz?: ChipRegisteredCrhz | null;
	/** cats */
	ear_tip?: boolean | null;
	/** cats */
	lifestyle?: Lifestyle | null;
	collar?: string | null;
	notes?: string | null;
};
export type UpdatePetInput = Partial<PetInput>;

/** Owner view: includes the chip number (it never leaves the API to anyone else). */
export type Pet = {
	id: Uuid;
	species: Species;
	name: string;
	breed_codes: BreedCode[];
	colours: Colour[];
	pattern: Pattern | null;
	size: Size | null;
	sex: Sex | null;
	birth_year: number | null;
	chip_number: string | null;
	chip_status: ChipStatus;
	chip_registered_crhz: ChipRegisteredCrhz | null;
	ear_tip: boolean | null;
	lifestyle: Lifestyle | null;
	collar: string | null;
	notes: string | null;
	photos: { id: Uuid; thumb_url: string }[];
	archived_at: IsoDateTime | null;
	created_at: IsoDateTime;
	updated_at: IsoDateTime;
};
export type PetList = { items: Pet[] };
