import type { AiAdapter } from './index.ts';

const moderation = { nsfw: false, violence: false, person_prominent: false, text_contact_info: false };
const FIXTURES = [
  { species: 'dog', breeds: [{ name: 'mixed', confidence: 0.6 }], colours: ['black', 'white'], multiple_animals: false, not_an_animal: false, moderation },
  { species: 'cat', breeds: [{ name: 'european shorthair', confidence: 0.7 }], colours: ['grey'], multiple_animals: false, not_an_animal: false, moderation },
];

/** Deterministic fixture chosen by photo hash; never calls an API. */
export const mockAi: AiAdapter = {
  provider: 'mock',
  extractAttributes: ({ sha256 }) => Promise.resolve(FIXTURES[(sha256.charCodeAt(0) || 0) % FIXTURES.length]),
};
