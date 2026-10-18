// C19 GET /v1/photos/:id/attributes: one fixture per status and notice, and a handler that answers `pending` first
// (the client polls every 750 ms until `ready` or `unavailable`).
//   createMockApi({ 'GET /v1/photos/:id/attributes': attributesPendingThenReady() })
import type { PhotoAttributes } from '@zivali/types';

import type { MockHandler } from '../mock.ts';

export const attributesPending: PhotoAttributes = { status: 'pending' };
/** AI off, a cap, refused, invalid or failed: the form stays manual. */
export const attributesUnavailable: PhotoAttributes = { status: 'unavailable' };

/** The C19 example: size below `ai.min_confidence` (value null, the low-confidence hint). */
export const attributesReady: PhotoAttributes = {
	status: 'ready',
	notice: null,
	species: { value: 'dog', confidence: 0.98 },
	breed_codes: { value: ['dog.labrador_retriever'], confidence: 0.81 },
	colours: { value: ['black'], confidence: 0.93 },
	pattern: { value: 'solid', confidence: 0.77 },
	size: { value: null, confidence: 0.41 },
	collar: { value: true, confidence: 0.88 },
};

/** A cat where most fields are below `ai.min_confidence`; the model saw no collar or pattern. */
export const attributesLowConfidence: PhotoAttributes = {
	status: 'ready',
	notice: null,
	species: { value: 'cat', confidence: 0.9 },
	breed_codes: { value: null, confidence: 0.35 },
	colours: { value: null, confidence: 0.52 },
	pattern: null,
	size: { value: null, confidence: 0.3 },
	collar: null,
};

const nothing = { species: null, breed_codes: null, colours: null, pattern: null, size: null, collar: null };
/** No animal in the photo: the retake hint. */
export const attributesNoAnimal: PhotoAttributes = { status: 'ready', notice: 'no_animal', ...nothing };
/** An animal that is not a dog or a cat: the retake hint. */
export const attributesOtherAnimal: PhotoAttributes = { status: 'ready', notice: 'other_animal', ...nothing };
/** Two or more animals: the "pick one animal" hint; the suggestions describe the main one. */
export const attributesMultipleAnimals: PhotoAttributes = {
	status: 'ready',
	notice: 'multiple_animals',
	species: { value: 'dog', confidence: 0.95 },
	breed_codes: { value: ['dog.border_collie', 'dog.mixed'], confidence: 0.66 },
	colours: { value: ['black', 'white'], confidence: 0.9 },
	pattern: { value: 'bicolour', confidence: 0.8 },
	size: { value: 'm', confidence: 0.62 },
	collar: { value: false, confidence: 0.7 },
};

/** `pending` for the first `polls` requests, then `result`. */
export function attributesPendingThenReady(result: PhotoAttributes = attributesReady, polls = 2): MockHandler {
	let calls = 0;
	return () => (calls++ < polls ? attributesPending : result);
}
