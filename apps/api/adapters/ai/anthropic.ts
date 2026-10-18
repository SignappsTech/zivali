// Claude vision over the official SDK (C19 §Provider call, ADR-012): one user turn with the image and a fixed
// instruction, a constant system prompt, structured output. No ids, metadata, location, user text or locale.
import Anthropic, { BadRequestError } from '@anthropic-ai/sdk';

import { aiExtractionJsonSchema } from '@zivali/validation/ai';

import type { Config } from '../../lib/config.ts';
import { parseExtraction, type AiAdapter, type AiReply } from './index.ts';

/** Stored on every ai_results row; bump it with any change to SYSTEM_PROMPT or INSTRUCTION. */
export const AI_PROMPT_VERSION = '2026-10-19.1';

const SYSTEM_PROMPT = `You describe photos of lost and found pets for a pet search service. Describe only the main \
animal in the photo. Never describe people, faces, clothing, places or any text in the image. Report a prominent \
person, nudity, gore or violence, or visible contact details (phone numbers, addresses, emails) only through the moderation \
booleans. Answer only with JSON that matches the given schema.`;

const INSTRUCTION = `Describe the main animal in this photo.
- animal: dog, cat, other (any other animal) or none (no animal). animal_count: 0, 1 or 2 (2 means two or more).
- Every confidence, species_confidence included, is a number from 0 to 1.
- breeds: at most 3, highest confidence first, only codes of the main animal's species from the schema. If no breed \
fits, use <species>.mixed or <species>.unknown. Empty when the animal is other or none.
- colours: at most 3 values. colours, pattern and size are null when you cannot tell.
- collar: whether the animal wears a collar or a harness.
- marks: at most 5 short English phrases about distinctive marks (white chest, torn left ear).
- moderation: each flag true only when the photo shows it.`;

const MAX_TOKENS = 1024;
// Haiku 5.5 allows thinking off up to effort high; Sonnet 5.5 rejects `disabled`, so it gets no thinking field (C19).
const THINKING_ALWAYS_ON = new Set(['claude-sonnet-5-5']);

type Effort = Config['AI_VISION_EFFORT'];
type Client = { messages: Pick<Anthropic['messages'], 'create'> };

/** The whole request: model, effort, the 1024 px JPEG and the fixed texts. No sampling parameters, no prefill. */
export function buildRequest(jpegBase64: string, model: string, effort: Effort) {
	return {
		model,
		max_tokens: MAX_TOKENS,
		...(THINKING_ALWAYS_ON.has(model) ? {} : { thinking: { type: 'disabled' as const } }),
		output_config: { effort, format: { type: 'json_schema' as const, schema: aiExtractionJsonSchema } },
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: 'user' as const,
				content: [
					{
						type: 'image' as const,
						source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: jpegBase64 },
					},
					{ type: 'text' as const, text: INSTRUCTION },
				],
			},
		],
	} satisfies Anthropic.MessageCreateParamsNonStreaming;
}

export function anthropicAi(client: Client, model: string, effort: Effort): AiAdapter {
	return {
		provider: 'anthropic',
		async extract({ jpegBase64 }): Promise<AiReply> {
			let res: Anthropic.Message;
			try {
				res = await client.messages.create(buildRequest(jpegBase64, model, effort));
			} catch (err) {
				// A rejected request fails at once (no retry); RateLimitError, 5xx and connection errors throw for retry.
				if (err instanceof BadRequestError)
					return { outcome: 'failed', model, input_tokens: 0, output_tokens: 0 };
				throw err;
			}
			const usage = {
				model: res.model,
				input_tokens: res.usage.input_tokens,
				output_tokens: res.usage.output_tokens,
			};
			if (res.stop_reason === 'refusal') return { ...usage, outcome: 'refused' };
			const text = res.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
			let raw: unknown;
			try {
				raw = JSON.parse(text);
			} catch {
				// Cut off at max_tokens, or not JSON: invalid like any schema failure.
				return { ...usage, outcome: 'invalid' };
			}
			const extraction = parseExtraction(raw);
			return extraction ? { ...usage, outcome: 'ok', extraction } : { ...usage, outcome: 'invalid' };
		},
	};
}
