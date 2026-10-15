// Breed codes (C4): `<species>.<breed>`; labels in the `breeds` i18n namespace under the same key.
import { BREED_CODES, CAT_BREEDS, DOG_BREEDS, type Species } from '@zivali/types';

import { z } from './zod.ts';

export { BREED_CODES, CAT_BREEDS, DOG_BREEDS };

export const BreedCode = z.enum(BREED_CODES).openapi('BreedCode');

export const breedsFor = (species: Species) => (species === 'dog' ? DOG_BREEDS : CAT_BREEDS);
export const isBreedOf = (code: string, species: Species) => code.startsWith(`${species}.`);

/** Label keys of the `breeds` i18n namespace: `breeds.dog.labrador_retriever`, … */
export const BREED_LABEL_KEYS = BREED_CODES.map((code) => `breeds.${code}`);
