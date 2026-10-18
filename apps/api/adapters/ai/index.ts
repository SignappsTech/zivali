// Vision model adapter (C19 §Provider call, ai.extract). Provider: AI_PROVIDER mock | anthropic | off. Unset means
// mock locally and off in staging and production: never anthropic without an explicit setting (TASK-40.1 review).
import Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';

import { aiExtractionSchema } from '@zivali/validation/ai';
import { isBreedOf } from '@zivali/validation/breeds';

import type { Config } from '../../lib/config.ts';
import { offAdapter, pickProvider } from '../select.ts';
import { anthropicAi } from './anthropic.ts';
import { mockAi } from './mock.ts';

export { AI_PROMPT_VERSION } from './anthropic.ts';

export type AiExtraction = z.output<typeof aiExtractionSchema>;
/** The image to describe and its photo's sha256 (only the mock reads the hash; it is never sent). */
export type AiImage = { jpegBase64: string; sha256: string };
/** One model call with its billed tokens; `extraction` only on `ok`. */
export type AiReply = { model: string; input_tokens: number; output_tokens: number } & (
	| { outcome: 'ok'; extraction: AiExtraction }
	| { outcome: 'refused' | 'invalid' | 'failed' }
);
export type AiAdapter = {
	provider: 'mock' | 'anthropic';
	/** Refusal, invalid output and a rejected request are replies; a retryable provider error (429, 5xx, network) throws. */
	extract(image: AiImage): Promise<AiReply>;
};

// SDK retries off: pg-boss retries ai.extract (2× after 2 s, C19), so a slow provider cannot stack attempts.
const TIMEOUT_MS = 20_000;

const clampConfidences = (node: unknown, key = ''): unknown => {
	if (Array.isArray(node)) return node.map((n) => clampConfidences(n));
	if (node && typeof node === 'object')
		return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, clampConfidences(v, k)]));
	return typeof node === 'number' && key.endsWith('confidence') ? Math.min(1, Math.max(0, node)) : node;
};

/**
 * Raw model JSON → AiExtraction, or null when it does not fit (C19 §Pipeline 5). Structured outputs carry no bounds,
 * so confidences are clamped to 0…1 and breeds of another species dropped here, on the raw JSON; aiExtractionSchema is
 * the final gate. Never the SDK's zod auto-parse.
 */
export function parseExtraction(raw: unknown): AiExtraction | null {
	const json = clampConfidences(raw) as Record<string, unknown> | null;
	if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
	const { animal, breeds } = json;
	if (Array.isArray(breeds))
		json.breeds = breeds.filter(
			(b: { code?: unknown } | null) =>
				(animal === 'dog' || animal === 'cat') && typeof b?.code === 'string' && isBreedOf(b.code, animal)
		);
	const parsed = aiExtractionSchema.safeParse(json);
	return parsed.success ? parsed.data : null;
}

export function createAi(cfg: Config): AiAdapter {
	const provider = cfg.AI_PROVIDER ?? (cfg.APP_ENV === 'local' ? undefined : 'off');
	const p = pickProvider('AI_PROVIDER', provider, !!cfg.ANTHROPIC_API_KEY, cfg.NODE_ENV === 'production');
	if (p === 'off') return offAdapter<AiAdapter>('AI_PROVIDER');
	if (p === 'mock') return mockAi(cfg.AI_VISION_MODEL);
	const client = new Anthropic({ apiKey: cfg.ANTHROPIC_API_KEY, maxRetries: 0, timeout: TIMEOUT_MS });
	return anthropicAi(client, cfg.AI_VISION_MODEL, cfg.AI_VISION_EFFORT);
}

/** A real provider (anthropic or mock) answers; the off adapter has no provider name (its props are throwers). */
export const aiOn = (ai: AiAdapter): boolean => ai.provider === 'anthropic' || ai.provider === 'mock';
