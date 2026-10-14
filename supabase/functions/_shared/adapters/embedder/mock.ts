import type { EmbedderAdapter } from './index.ts';

const DIM = 1024;

/** Deterministic unit vector from the image's SHA-256: same bytes, same vector; never calls an API. */
export const mockEmbedder: EmbedderAdapter = {
  provider: 'mock',
  async embed(image) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', image));
    const raw = Array.from({ length: DIM }, (_, i) => digest[i % digest.length] / 255 - 0.5);
    const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0)) || 1;
    return { model: 'mock-embedder', dim: DIM, vector: raw.map((v) => v / norm) };
  },
};
