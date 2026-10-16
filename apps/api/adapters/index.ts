// All adapters in one object: ctx.adapters in domains and jobs (ADR-020). Each factory picks mock or real by config.
import { config, type Config } from '../lib/config.ts';
import { createAi, type AiAdapter } from './ai/index.ts';
import { createCaptcha, type CaptchaAdapter } from './captcha/index.ts';
import { createEmail, type EmailAdapter } from './email/index.ts';
import { createEmbedder, type EmbedderAdapter } from './embedder/index.ts';
import { createFiscal, type FiscalAdapter } from './fiscal/index.ts';
import { createPayments, type PaymentsAdapter } from './payments/index.ts';
import { createPush, type PushAdapter } from './push/index.ts';
import { createStorage, type StorageAdapter } from './storage/index.ts';

export type Adapters = {
	ai: AiAdapter;
	embedder: EmbedderAdapter;
	payments: PaymentsAdapter;
	fiscal: FiscalAdapter;
	email: EmailAdapter;
	push: PushAdapter;
	captcha: CaptchaAdapter;
	storage: StorageAdapter;
};

export function createAdapters(cfg: Config): Adapters {
	return {
		ai: createAi(cfg),
		embedder: createEmbedder(cfg),
		payments: createPayments(cfg),
		fiscal: createFiscal(cfg),
		email: createEmail(cfg),
		push: createPush(cfg),
		captcha: createCaptcha(cfg),
		storage: createStorage(cfg),
	};
}

export const adapters = createAdapters(config);
