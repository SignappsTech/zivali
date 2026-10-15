// Embedding adapter (M3 photo.embed). Provider: EMBEDDER_PROVIDER mock | voyage. Vectors have EMBED_DIM entries.
import type { Config } from '../../lib/config.ts';
import { offAdapter, pickProvider } from '../select.ts';
import { mockEmbedder } from './mock.ts';
import { voyageEmbedder } from './voyage.ts';

export const EMBED_DIM = 1024;
export type EmbedderAdapter = { embed(inputs: { text?: string; imageBase64?: string }[]): Promise<number[][]> };

export function createEmbedder(cfg: Config): EmbedderAdapter {
	const p = pickProvider(
		'EMBEDDER_PROVIDER',
		cfg.EMBEDDER_PROVIDER,
		!!cfg.VOYAGE_API_KEY,
		cfg.NODE_ENV === 'production'
	);
	if (p === 'off') return offAdapter<EmbedderAdapter>('EMBEDDER_PROVIDER');
	return p === 'mock' ? mockEmbedder() : voyageEmbedder(cfg.VOYAGE_API_KEY!);
}
