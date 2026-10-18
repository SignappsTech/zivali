// C19 AI attribute extraction: the model output schema (worker, TASK-40.3), the JSON schema sent as
// `output_config.format`, and the GET /v1/photos/:id/attributes DTO (TASK-40.4). Subpath only (not in the root index):
// clients use the types from @zivali/types.
import { AI_ANIMALS } from '@zivali/types';

import { BreedCode, isBreedOf } from './breeds.ts';
import { nullOr } from './common.schema.ts';
import { AiNotice, Colour, Pattern, Size, Species } from './enums.ts';
import { z } from './zod.ts';

const confidence = z.number().min(0).max(1);

export const aiExtractionSchema = z
	.object({
		animal: z.enum(AI_ANIMALS),
		/** 2 = two or more */
		animal_count: z.number().int().min(0).max(2),
		species_confidence: confidence,
		/** Same species as `animal`, highest first. */
		breeds: z.array(z.object({ code: BreedCode, confidence })).max(3),
		colours: z.object({ values: z.array(Colour).min(1).max(3), confidence }).nullable(),
		pattern: z.object({ value: Pattern, confidence }).nullable(),
		size: z.object({ value: Size, confidence }).nullable(),
		collar: z.object({ present: z.boolean(), confidence }),
		/** Short English phrases (white chest, torn left ear). */
		marks: z.array(z.string().max(100)).max(5),
		moderation: z.object({
			person_prominent: z.boolean(),
			nsfw: z.boolean(),
			violence: z.boolean(),
			text_contact_info: z.boolean(),
		}),
	})
	.superRefine(({ animal, breeds }, ctx) => {
		for (const [i, { code }] of breeds.entries())
			if ((animal !== 'dog' && animal !== 'cat') || !isBreedOf(code, animal))
				ctx.addIssue({ code: 'custom', path: ['breeds', i, 'code'], message: 'Breed of another species' });
	});

// Structured outputs reject numeric and string bounds and maxItems; the SDK call validates the reply with
// aiExtractionSchema afterwards, which checks them (and the breed species).
const UNSUPPORTED = new Set([
	'$schema',
	'minimum',
	'maximum',
	'exclusiveMinimum',
	'exclusiveMaximum',
	'multipleOf',
	'minLength',
	'maxLength',
	'maxItems',
]);
const strip = (node: unknown, isProperties = false): unknown => {
	if (Array.isArray(node)) return node.map((n) => strip(n));
	if (!node || typeof node !== 'object') return node;
	return Object.fromEntries(
		Object.entries(node)
			.filter(([key]) => isProperties || !UNSUPPORTED.has(key))
			.map(([key, value]) => [key, strip(value, !isProperties && key === 'properties')])
	);
};
/** `output_config: { format: { type: 'json_schema', schema: aiExtractionJsonSchema } }`; every object closed. */
export const aiExtractionJsonSchema = strip(
	// An empty registry: no `.openapi()` ids or metadata, so every enum is inlined (no $defs).
	z.toJSONSchema(aiExtractionSchema, { metadata: z.registry() })
) as Record<string, unknown>;

/** `value` null: confidence < `ai.min_confidence`. */
const suggestion = <T extends z.ZodType>(value: T) => nullOr(z.object({ value: nullOr(value), confidence }));

export const photoAttributesSchema = z
	.discriminatedUnion('status', [
		z.object({ status: z.literal('pending') }),
		z.object({ status: z.literal('unavailable') }),
		z.object({
			status: z.literal('ready'),
			notice: nullOr(AiNotice),
			species: suggestion(Species),
			breed_codes: suggestion(z.array(BreedCode).max(2)),
			colours: suggestion(z.array(Colour).max(3)),
			pattern: suggestion(Pattern),
			size: suggestion(Size),
			collar: suggestion(z.boolean()),
		}),
	])
	.openapi('PhotoAttributes');
