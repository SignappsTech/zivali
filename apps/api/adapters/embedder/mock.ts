import { createHash } from 'node:crypto';

import { EMBED_DIM, type EmbedderAdapter } from './index.ts';

// Deterministic vector from a hash of the input: same input, same vector.
export function mockEmbedder(): EmbedderAdapter {
	return {
		embed: async (inputs) =>
			inputs.map((input) => {
				const seed = createHash('sha512')
					.update(input.text ?? input.imageBase64 ?? '')
					.digest();
				return Array.from({ length: EMBED_DIM }, (_, i) => (seed[i % seed.length]! - 128) / 128);
			}),
	};
}
