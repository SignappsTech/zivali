// C4 pets (owner only): POST/PATCH /v1/pets, Pet responses with the chip number.
import { COLOURS } from '@zivali/types';

import { BreedCode, isBreedOf } from './breeds.ts';
import { IsoDateTime, nullOr, text, Uuid } from './common.schema.ts';
import { ChipRegisteredCrhz, ChipStatus, Colour, Lifestyle, Pattern, Sex, Size, Species } from './enums.ts';
import { z } from './zod.ts';

const BirthYear = z
	.number()
	.int()
	.min(1990)
	.refine((y) => y <= new Date().getFullYear(), 'In the future');

const PetFields = z.object({
	species: Species,
	name: text(60),
	breed_codes: z.array(BreedCode).max(5).optional(),
	colours: z.array(Colour).max(COLOURS.length).optional(),
	pattern: nullOr(Pattern).optional(),
	size: nullOr(Size).optional(),
	sex: nullOr(Sex).optional(),
	birth_year: BirthYear.nullish(),
	chip: z.string().max(40).nullish(),
	chip_registered_crhz: nullOr(ChipRegisteredCrhz).optional(),
	ear_tip: z.boolean().nullish(),
	lifestyle: nullOr(Lifestyle).optional(),
	collar: text(200).nullish(),
	notes: text(1000).nullish(),
});

export const PetInput = PetFields.superRefine((p, ctx) => {
	p.breed_codes?.forEach((code, i) => {
		if (!isBreedOf(code, p.species))
			ctx.addIssue({ code: 'custom', path: ['breed_codes', i], message: 'Breed of another species' });
	});
}).openapi('PetInput');
/** PATCH /v1/pets/:id (the domain checks breeds against the stored species). */
export const UpdatePetInput = PetFields.partial().openapi('UpdatePetInput');

export const Pet = z
	.object({
		id: Uuid,
		species: Species,
		name: z.string(),
		breed_codes: z.array(BreedCode),
		colours: z.array(Colour),
		pattern: nullOr(Pattern),
		size: nullOr(Size),
		sex: nullOr(Sex),
		birth_year: z.number().int().nullable(),
		chip_number: z.string().nullable(),
		chip_status: ChipStatus,
		chip_registered_crhz: nullOr(ChipRegisteredCrhz),
		ear_tip: z.boolean().nullable(),
		lifestyle: nullOr(Lifestyle),
		collar: z.string().nullable(),
		notes: z.string().nullable(),
		photos: z.array(z.object({ id: Uuid, thumb_url: z.string() })),
		archived_at: IsoDateTime.nullable(),
		created_at: IsoDateTime,
		updated_at: IsoDateTime,
	})
	.openapi('Pet', { description: 'Owner view of a pet profile.' });
export const PetList = z.object({ items: z.array(Pet) }).openapi('PetList');
