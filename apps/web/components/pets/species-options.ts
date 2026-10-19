import type { Pattern, Size, Species } from '@zivali/types';

// Glossary §7.3: patterns per species, so "Tigrasta" never means two things. §7.1: cats show only s, m, l.
// Shared by PetFields and the AI pre-fill, which fills only values the chosen species has (TASK-41.2).
export const PATTERNS: Record<Species, readonly Pattern[]> = {
	dog: ['solid', 'bicolour', 'tricolour', 'brindle', 'merle', 'spotted', 'other'],
	cat: ['solid', 'bicolour', 'tabby', 'tortoiseshell', 'calico', 'spotted', 'pointed', 'other'],
};
export const SIZES: Record<Species, readonly Size[]> = { dog: ['xs', 's', 'm', 'l', 'xl'], cat: ['s', 'm', 'l'] };
