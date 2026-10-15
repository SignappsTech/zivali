import type { AiAdapter } from './index.ts';

export function mockAi(): AiAdapter {
	return { vision: async ({ images }) => ({ text: `mock vision: ${images.length} image(s)` }) };
}
