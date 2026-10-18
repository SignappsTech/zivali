// AI adapters (C19 §Provider call, §Mock): the request the anthropic adapter builds, its reply and error mapping, and
// the raw-JSON gate, all against a stubbed SDK client (no test reaches Anthropic); the mock's fixtures by sha256.
import { readFileSync } from 'node:fs';

import {
	APIConnectionError,
	AuthenticationError,
	BadRequestError,
	InternalServerError,
	NotFoundError,
	PermissionDeniedError,
	RateLimitError,
	UnprocessableEntityError,
} from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';

import { aiExtractionJsonSchema } from '@zivali/validation/ai';

import { anthropicAi, buildRequest } from '../../adapters/ai/anthropic.ts';
import { parseExtraction } from '../../adapters/ai/index.ts';
import { MOCK_TOKENS, mockAi } from '../../adapters/ai/mock.ts';

const MODEL = 'claude-haiku-5-5';
const JPEG = '/9j/4AAQSkZJRgABAQ';
const SHA = 'f'.repeat(64);
const index = JSON.parse(readFileSync(new URL('../fixtures/ai/index.json', import.meta.url), 'utf8')) as Record<
	string,
	string
>;

const valid = {
	animal: 'dog',
	animal_count: 1,
	species_confidence: 0.98,
	breeds: [{ code: 'dog.labrador_retriever', confidence: 0.81 }],
	colours: { values: ['black'], confidence: 0.93 },
	pattern: { value: 'solid', confidence: 0.77 },
	size: { value: 'l', confidence: 0.41 },
	collar: { present: true, confidence: 0.88 },
	marks: ['white chest'],
	moderation: { person_prominent: false, nsfw: false, violence: false, text_contact_info: false },
};

const message = (over: Record<string, unknown> = {}) => ({
	id: 'msg_test',
	type: 'message',
	role: 'assistant',
	model: MODEL,
	stop_reason: 'end_turn',
	stop_sequence: null,
	content: [{ type: 'text', text: JSON.stringify(valid) }],
	usage: { input_tokens: 1234, output_tokens: 156 },
	...over,
});

/** An adapter on a stubbed SDK client: `create` resolves the reply or rejects with the error. */
function stubbed(reply: unknown, model = MODEL) {
	const create = vi.fn(async () => {
		if (reply instanceof Error) throw reply;
		return reply;
	});
	return { ai: anthropicAi({ messages: { create } } as never, model, 'low'), create };
}

const headers = new Headers();
const apiError = (body: string) => ({ type: 'error', error: { type: 'x', message: body } });

describe('anthropic adapter: the request', () => {
	it('sends the model, effort, structured output, thinking off, the JPEG and the fixed texts only', async () => {
		const { ai, create } = stubbed(message());
		await ai.extract({ jpegBase64: JPEG, sha256: SHA });
		expect(create).toHaveBeenCalledTimes(1);
		const [request] = create.mock.calls[0] as unknown as [Record<string, unknown>];
		expect(Object.keys(request).sort()).toEqual([
			'max_tokens',
			'messages',
			'model',
			'output_config',
			'system',
			'thinking',
		]);
		expect(request).toMatchObject({
			model: MODEL,
			max_tokens: 1024,
			thinking: { type: 'disabled' },
			output_config: { effort: 'low', format: { type: 'json_schema', schema: aiExtractionJsonSchema } },
		});
		const messages = request.messages as { role: string; content: Record<string, unknown>[] }[];
		expect(messages).toHaveLength(1);
		expect(messages[0]!.role).toBe('user');
		expect(messages[0]!.content.map((c) => c.type)).toEqual(['image', 'text']);
		expect(messages[0]!.content[0]).toEqual({
			type: 'image',
			source: { type: 'base64', media_type: 'image/jpeg', data: JPEG },
		});
		// No sampling parameters, metadata, prefill, ids or hash.
		const json = JSON.stringify(request);
		for (const key of ['temperature', 'top_p', 'top_k', 'metadata', 'stop_sequences'])
			expect(json).not.toContain(key);
		expect(json).not.toContain(SHA);
		// The same texts for every photo.
		expect(buildRequest('other', MODEL, 'low').system).toBe(request.system);
	});

	it('states the limits the JSON schema cannot carry', () => {
		const { system, messages } = buildRequest(JPEG, MODEL, 'low');
		const text = `${system}\n${(messages[0]!.content[1] as { text: string }).text}`;
		expect(text).toMatch(/breeds: at most 3/);
		expect(text).toMatch(/colours: at most 3/);
		expect(text).toMatch(/marks: at most 5/);
		expect(text).toMatch(/from 0 to 1/);
		expect(text).toMatch(/animal_count: 0, 1 or 2/);
		expect(text).toMatch(/<species>\.mixed or <species>\.unknown/);
		expect(text).toMatch(/Never describe people, faces, clothing, places or any text/);
	});

	it('leaves thinking out on claude-sonnet-5-5 (it rejects disabled) and passes the effort through', () => {
		const request = buildRequest(JPEG, 'claude-sonnet-5-5', 'medium');
		expect(request).not.toHaveProperty('thinking');
		expect(request.output_config.effort).toBe('medium');
	});
});

describe('anthropic adapter: the reply', () => {
	it('ok: the parsed extraction with the billed tokens and the answering model', async () => {
		const { ai } = stubbed(message());
		expect(await ai.extract({ jpegBase64: JPEG, sha256: SHA })).toEqual({
			outcome: 'ok',
			model: MODEL,
			input_tokens: 1234,
			output_tokens: 156,
			extraction: valid,
		});
	});

	it('refusal: refused, with its tokens', async () => {
		const { ai } = stubbed(message({ stop_reason: 'refusal', content: [] }));
		expect(await ai.extract({ jpegBase64: JPEG, sha256: SHA })).toEqual({
			outcome: 'refused',
			model: MODEL,
			input_tokens: 1234,
			output_tokens: 156,
		});
	});

	it('not JSON (cut off at max_tokens) or outside the schema: invalid', async () => {
		const cut = stubbed(
			message({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{"animal": "do' }] })
		);
		expect(await cut.ai.extract({ jpegBase64: JPEG, sha256: SHA })).toMatchObject({ outcome: 'invalid' });
		const unknownColour = { ...valid, colours: { values: ['purple'], confidence: 0.9 } };
		const bad = stubbed(message({ content: [{ type: 'text', text: JSON.stringify(unknownColour) }] }));
		expect(await bad.ai.extract({ jpegBase64: JPEG, sha256: SHA })).toMatchObject({
			outcome: 'invalid',
			input_tokens: 1234,
		});
	});

	it('a rejected request (400, 401, 403, 404, 422): failed at once with its error class, no throw (no retry)', async () => {
		for (const err of [
			new BadRequestError(400, apiError('bad image'), 'bad image', headers),
			new AuthenticationError(401, apiError('bad key'), 'bad key', headers),
			new PermissionDeniedError(403, apiError('denied'), 'denied', headers),
			new NotFoundError(404, apiError('no model'), 'no model', headers),
			new UnprocessableEntityError(422, apiError('unprocessable'), 'unprocessable', headers),
		]) {
			const { ai } = stubbed(err);
			expect(await ai.extract({ jpegBase64: JPEG, sha256: SHA })).toEqual({
				outcome: 'failed',
				model: MODEL,
				input_tokens: 0,
				output_tokens: 0,
				error: err.constructor.name,
			});
		}
	});

	it('rate limit, 5xx and connection errors throw for the job retry', async () => {
		for (const err of [
			new RateLimitError(429, apiError('slow down'), 'slow down', headers),
			new InternalServerError(529, apiError('overloaded'), 'overloaded', headers),
			new APIConnectionError({ message: 'socket hang up' }),
		]) {
			const { ai } = stubbed(err);
			await expect(ai.extract({ jpegBase64: JPEG, sha256: SHA })).rejects.toBe(err);
		}
	});
});

describe('parseExtraction (the raw-JSON gate)', () => {
	it('clamps confidences to 0…1 and drops breeds of another species, then validates', () => {
		const raw = {
			...valid,
			species_confidence: 1.7,
			breeds: [
				{ code: 'cat.siamese', confidence: 0.9 },
				{ code: 'dog.labrador_retriever', confidence: -0.2 },
			],
			colours: { values: ['black'], confidence: 3 },
		};
		expect(parseExtraction(raw)).toMatchObject({
			species_confidence: 1,
			breeds: [{ code: 'dog.labrador_retriever', confidence: 0 }],
			colours: { confidence: 1 },
		});
	});

	it('drops every breed when the animal is not a dog or cat', () => {
		expect(parseExtraction({ ...valid, animal: 'other' })?.breeds).toEqual([]);
	});

	it('cuts breeds and colours to 3 and marks to 5, so one extra item does not void the rest', () => {
		const parsed = parseExtraction({
			...valid,
			breeds: [0.9, 0.8, 0.7, 0.6].map((confidence) => ({ code: 'dog.labrador_retriever', confidence })),
			colours: { values: ['black', 'white', 'tan', 'brown'], confidence: 0.8 },
			marks: ['a', 'b', 'c', 'd', 'e', 'f'],
		});
		expect(parsed?.breeds.map((b) => b.confidence)).toEqual([0.9, 0.8, 0.7]);
		expect(parsed?.colours?.values).toEqual(['black', 'white', 'tan']);
		expect(parsed?.marks).toEqual(['a', 'b', 'c', 'd', 'e']);
	});

	it('anything else outside the schema is null', () => {
		expect(parseExtraction({ ...valid, animal_count: 3 })).toBeNull();
		expect(parseExtraction({ ...valid, colours: { values: ['purple'], confidence: 0.9 } })).toBeNull();
		expect(parseExtraction({ ...valid, marks: ['x'.repeat(101)] })).toBeNull();
		expect(parseExtraction({ ...valid, extra: true })).toEqual(valid);
		expect(parseExtraction(null)).toBeNull();
		expect(parseExtraction([valid])).toBeNull();
	});
});

describe('mock adapter', () => {
	const mock = mockAi(MODEL);
	const shaOf = (name: string) => Object.entries(index).find(([, n]) => n === name)![0];

	it('derives a deterministic dog from the hash: one breed at 0.82, black and white at 0.9, size m at 0.4', async () => {
		const reply = await mock.extract({ jpegBase64: JPEG, sha256: SHA });
		expect(reply).toMatchObject({ outcome: 'ok', model: MODEL, ...MOCK_TOKENS });
		if (reply.outcome !== 'ok') throw new Error('expected ok');
		expect(reply.extraction).toMatchObject({
			animal: 'dog',
			breeds: [{ confidence: 0.82 }],
			colours: { values: ['black', 'white'], confidence: 0.9 },
			size: { value: 'm', confidence: 0.4 },
		});
		expect(reply.extraction.breeds[0]!.code).toMatch(/^dog\./);
		expect(await mock.extract({ jpegBase64: 'other', sha256: SHA })).toEqual(reply);
	});

	it('the refusal, invalid and person fixtures by sha256 (fixtures/ai/index.json)', async () => {
		expect(await mock.extract({ jpegBase64: JPEG, sha256: shaOf('refusal') })).toEqual({
			outcome: 'refused',
			model: MODEL,
			...MOCK_TOKENS,
		});
		expect(await mock.extract({ jpegBase64: JPEG, sha256: shaOf('invalid') })).toMatchObject({
			outcome: 'invalid',
		});
		expect(await mock.extract({ jpegBase64: JPEG, sha256: shaOf('person') })).toMatchObject({
			outcome: 'ok',
			extraction: { animal: 'dog', moderation: { person_prominent: true } },
		});
	});

	it('a hash that is not 64 hex characters never names a file', async () => {
		expect(await mock.extract({ jpegBase64: JPEG, sha256: '../fixtures/ai/refusal' })).toMatchObject({
			outcome: 'ok',
		});
	});
});
