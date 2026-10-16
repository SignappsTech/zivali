import { describe, expect, it, vi } from 'vitest';

import MatchesPage from './page';

vi.mock('@/components/matches/match-review', () => ({ MatchReview: () => null }));

const UUID = '0b8c6f1e-4f6a-4b6e-9a53-6b0d3c2f9a11';

async function selectedFor(m: unknown) {
	const el = (await MatchesPage({
		params: Promise.resolve({ locale: 'sl', code: 'Luna1234' }),
		searchParams: Promise.resolve({ m }),
	} as never)) as { props: { children: { props: { selected?: string } } } };
	return el.props.children.props.selected;
}

describe('matches page', () => {
	it('passes a uuid ?m through', async () => {
		expect(await selectedFor(UUID)).toBe(UUID);
	});
	it('drops a garbled ?m so the list shows', async () => {
		expect(await selectedFor('not-a-uuid')).toBeUndefined();
		expect(await selectedFor(['a', 'b'])).toBeUndefined();
	});
});
