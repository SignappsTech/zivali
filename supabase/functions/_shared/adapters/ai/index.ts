import { env, type Env } from '../../env.ts';
import { notImplemented, pickProvider } from '../select.ts';
import { mockAi } from './mock.ts';

export interface AiPhoto {
  /** SHA-256 of the photo (cache key) */
  sha256: string;
  /** 1024 px public variant, EXIF stripped */
  imageUrl: string;
}

export interface AiAdapter {
  readonly provider: string;
  /** Raw structured attributes; callers re-validate with the zod schema from @zivali/validation (ADR-012). */
  extractAttributes(photo: AiPhoto): Promise<unknown>;
}

/** AI_PROVIDER = mock | anthropic (ANTHROPIC_API_KEY). ADR-012. */
export function aiAdapter(get: Env = env): AiAdapter {
  const provider = pickProvider('AI_PROVIDER', { anthropic: ['ANTHROPIC_API_KEY'] }, get);
  return provider === 'mock' ? mockAi : notImplemented('AI_PROVIDER', provider);
}
