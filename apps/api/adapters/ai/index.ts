// Vision model adapter (M3 ai.extract). Provider: AI_PROVIDER mock | anthropic.
import type { Config } from '../../lib/config.ts';
import { offAdapter, pickProvider } from '../select.ts';
import { anthropicAi } from './anthropic.ts';
import { mockAi } from './mock.ts';

export type VisionImage = { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string };
export type AiAdapter = {
	vision(input: { prompt: string; images: VisionImage[] }): Promise<{ text: string }>;
};

export function createAi(cfg: Config): AiAdapter {
	const p = pickProvider('AI_PROVIDER', cfg.AI_PROVIDER, !!cfg.ANTHROPIC_API_KEY, cfg.NODE_ENV === 'production');
	if (p === 'off') return offAdapter<AiAdapter>('AI_PROVIDER');
	return p === 'mock' ? mockAi() : anthropicAi(cfg.ANTHROPIC_API_KEY!, cfg.AI_VISION_MODEL);
}
