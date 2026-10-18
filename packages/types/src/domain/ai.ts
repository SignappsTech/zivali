// C19 AI attribute extraction: the model output (worker only) and the suggestions the photo owner polls for.
import type { BreedCode } from './breeds.ts';
import type { AiAnimal, AiNotice, Colour, Pattern, Size, Species } from './enums.ts';

/** Structured model output for one photo (`aiExtractionSchema`); never sent to clients. */
export type AiExtraction = {
	/** The main animal. */
	animal: AiAnimal;
	/** 0, 1, 2 (2 = two or more). */
	animal_count: number;
	/** 0…1 */
	species_confidence: number;
	/** ≤ 3, same species, highest first. */
	breeds: { code: BreedCode; confidence: number }[];
	/** ≤ 3 values. */
	colours: { values: Colour[]; confidence: number } | null;
	pattern: { value: Pattern; confidence: number } | null;
	size: { value: Size; confidence: number } | null;
	collar: { present: boolean; confidence: number };
	/** ≤ 5 short English phrases (white chest, torn left ear); stored, not shown in M3. */
	marks: string[];
	moderation: { person_prominent: boolean; nsfw: boolean; violence: boolean; text_contact_info: boolean };
};

/** `value` null: confidence < `ai.min_confidence` (0.6). */
export type Suggestion<T> = { value: T | null; confidence: number };

/** GET /v1/photos/:id/attributes. A `null` field: the model saw nothing for it. */
export type PhotoAttributes =
	/** Photo not accepted yet, or no ai_calls row for it yet: keep polling. */
	| { status: 'pending' }
	/** AI off, a cap, refused, invalid or failed: the form stays manual, no error shown. */
	| { status: 'unavailable' }
	| {
			status: 'ready';
			notice: AiNotice | null;
			species: Suggestion<Species> | null;
			/** Codes ≥ min confidence, at most 2; confidence = the best one's. */
			breed_codes: Suggestion<BreedCode[]> | null;
			colours: Suggestion<Colour[]> | null;
			pattern: Suggestion<Pattern> | null;
			size: Suggestion<Size> | null;
			/** true: hint "describe the collar"; the collar text is never filled. */
			collar: Suggestion<boolean> | null;
	  };
