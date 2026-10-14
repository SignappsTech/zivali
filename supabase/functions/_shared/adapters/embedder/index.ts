import { env, type Env } from '../../env.ts';
import { notImplemented, pickProvider } from '../select.ts';
import { mockEmbedder } from './mock.ts';

export interface Embedding {
  model: string;
  dim: number;
  vector: number[];
}

export interface EmbedderAdapter {
  readonly provider: string;
  embed(image: Uint8Array<ArrayBuffer>): Promise<Embedding>;
}

/** EMBEDDER_PROVIDER = mock | voyage (VOYAGE_API_KEY). ADR-013. */
export function embedderAdapter(get: Env = env): EmbedderAdapter {
  const provider = pickProvider('EMBEDDER_PROVIDER', { voyage: ['VOYAGE_API_KEY'] }, get);
  return provider === 'mock' ? mockEmbedder : notImplemented('EMBEDDER_PROVIDER', provider);
}
