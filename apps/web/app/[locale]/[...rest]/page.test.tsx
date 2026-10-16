import { describe, expect, it, vi } from 'vitest';

import CatchAll from './page';

vi.mock('next/navigation', async (original) => ({
	...(await original<object>()),
	notFound: () => {
		throw new Error('NEXT_NOT_FOUND');
	},
}));

const props = (locale: 'sl' | 'en', ...rest: string[]) =>
	({ params: Promise.resolve({ locale, rest }) }) as PageProps<'/[locale]/[...rest]'>;

describe('CatchAll', () => {
	it('answers 404 for every other path', () => {
		for (const rest of [
			['no', 'such', 'page'],
			['map', 'x'],
			['account', 'security'],
		])
			expect(() => CatchAll(props('sl', ...rest))).toThrow('NEXT_NOT_FOUND');
	});
});
