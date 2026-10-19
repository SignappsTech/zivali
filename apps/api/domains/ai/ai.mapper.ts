// Stored extraction → the C19 PhotoAttributes DTO. Only the listed suggestions go out: moderation, marks and the model
// never do (the final parse strips anything else).
import type { z } from 'zod';

import { photoAttributesSchema } from '@zivali/validation/ai';

import type { AttributesView } from './ai.domain.ts';

const NOTHING = { species: null, breed_codes: null, colours: null, pattern: null, size: null, collar: null };

export function toPhotoAttributes(view: AttributesView): z.output<typeof photoAttributesSchema> {
	if (view.status !== 'ready') return photoAttributesSchema.parse({ status: view.status });
	const { extraction: e, min_confidence: min } = view;
	const notice =
		e.animal === 'none'
			? 'no_animal'
			: e.animal === 'other'
				? 'other_animal'
				: e.animal_count >= 2
					? 'multiple_animals'
					: null;
	// No dog or cat: the retake hint only, nothing to pre-fill a dog or cat form with.
	if (e.animal !== 'dog' && e.animal !== 'cat')
		return photoAttributesSchema.parse({ status: 'ready', notice, ...NOTHING });
	// value null below ai.min_confidence: the field stays empty with the low-confidence hint.
	const suggest = <T>(value: T, confidence: number) => ({ value: confidence >= min ? value : null, confidence });
	const breeds = [...e.breeds].sort((a, b) => b.confidence - a.confidence);
	const codes = breeds
		.filter((b) => b.confidence >= min)
		.slice(0, 2)
		.map((b) => b.code);
	return photoAttributesSchema.parse({
		status: 'ready',
		notice,
		species: suggest(e.animal, e.species_confidence),
		// The codes at or above the minimum (at most 2), with the best one's confidence.
		breed_codes: breeds[0] ? suggest(codes, breeds[0].confidence) : null,
		colours: e.colours && suggest(e.colours.values, e.colours.confidence),
		pattern: e.pattern && suggest(e.pattern.value, e.pattern.confidence),
		size: e.size && suggest(e.size.value, e.size.confidence),
		collar: suggest(e.collar.present, e.collar.confidence),
	});
}

export default { toPhotoAttributes };
