import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AreaMap } from './area-map';

// MapLibre itself is covered by components/map; here: when the page starts it (TASK-18.6).
vi.mock('@/components/map/map-view', () => ({
	MapView: (props: { label: string; textAlternative: React.ReactNode }) => (
		<div data-testid="map" aria-label={props.label}>
			{props.textAlternative}
		</div>
	),
}));

let report: (entry: Partial<IntersectionObserverEntry>) => void;
class FakeObserver {
	constructor(callback: IntersectionObserverCallback) {
		report = (entry) => callback([entry as IntersectionObserverEntry], this as unknown as IntersectionObserver);
	}
	observe() {}
	disconnect() {}
}

const show = () =>
	render(
		<AreaMap
			area={{ lat: 46.064, lng: 14.493, radius_m: 500 }}
			type="lost"
			title="Rex"
			ownLabel="Vi"
			label="Območje"
		>
			<p>Območje: Šiška, približno 500 m</p>
		</AreaMap>
	);
/** The box enters the observer's 400 px margin with its top `top` px from the top of the viewport. */
const near = (top: number) =>
	act(() => report({ isIntersecting: true, boundingClientRect: { top } as DOMRectReadOnly }));
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

beforeEach(() => vi.stubGlobal('IntersectionObserver', FakeObserver));
afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe('AreaMap start (TASK-18.6)', () => {
	it('starts at once when the box is on screen', async () => {
		show();
		near(window.innerHeight - 100);
		expect((await screen.findByTestId('map')).getAttribute('aria-label')).toBe('Območje');
	});

	it('below the fold keeps the box and the area line, and starts with the next scroll', async () => {
		const { container } = show();
		near(window.innerHeight + 200);
		await settle();
		expect(screen.queryByTestId('map')).toBeNull();
		expect(container.querySelector('[data-slot="map-view"]')).toBeTruthy();
		expect(screen.getByText('Območje: Šiška, približno 500 m')).toBeTruthy();

		fireEvent.scroll(window);
		expect(await screen.findByTestId('map')).toBeTruthy();
	});

	it('does not start for a scroll once the box is far again', async () => {
		show();
		near(window.innerHeight + 200);
		act(() => report({ isIntersecting: false }));
		fireEvent.scroll(window);
		await settle();
		expect(screen.queryByTestId('map')).toBeNull();
	});
});
