import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LegalToc } from './legal-toc';

const headings = [
	{ id: 's1', text: '1. Na kratko' },
	{ id: 's2', text: '2. Kdo je upravljavec' },
	{ id: 's3', text: '3. Katere podatke obdelujemo' },
	{ id: 's4', text: '4. Spremembe' },
];

/** IntersectionObserver stand-in; `report` hands the callback one entry per target. */
class FakeObserver {
	static all: FakeObserver[] = [];
	targets: Element[] = [];
	disconnected = false;
	constructor(
		private callback: IntersectionObserverCallback,
		readonly options?: IntersectionObserverInit
	) {
		FakeObserver.all.push(this);
	}
	observe(target: Element) {
		this.targets.push(target);
	}
	unobserve() {}
	disconnect() {
		this.disconnected = true;
	}
	report(entries: [Element, boolean][]) {
		this.callback(
			entries.map(([target, isIntersecting]) => ({ target, isIntersecting }) as IntersectionObserverEntry),
			this as unknown as IntersectionObserver
		);
	}
}
const [line, tail] = [0, 1].map((i) => () => FakeObserver.all[i]!);
const head = (id: string) => document.getElementById(id)!;

/** The page after a scroll: the first `above` headings are above the reading line; `end`: the text's end is in view. */
function scroll(above: number, { end = false, y = 1000 } = {}) {
	Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
	act(() => {
		line().report(headings.map(({ id }, i) => [head(id), i < above]));
		tail().report([[document.querySelector('#body')!, !end]]);
	});
}
/** The marked entries: one link per list (disclosure and sticky), so one text if exactly one entry is current. */
const marked = () => [...new Set([...document.querySelectorAll('[aria-current]')].map((a) => a.textContent))];

function show() {
	return render(
		<>
			<LegalToc label="Na tej strani" headings={headings} />
			<article>
				<div id="body">
					{headings.map(({ id, text }) => (
						<h2 key={id} id={id}>
							{text}
						</h2>
					))}
				</div>
			</article>
		</>
	);
}

beforeEach(() => {
	FakeObserver.all = [];
	vi.stubGlobal('IntersectionObserver', FakeObserver);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.unstubAllGlobals();
	Reflect.deleteProperty(window, 'scrollY');
});

describe('LegalToc', () => {
	it('server-renders plain #links with nothing marked (no JS)', () => {
		const html = renderToStaticMarkup(<LegalToc label="Na tej strani" headings={headings} />);
		expect(html).toContain('href="#s1"');
		expect(html).toContain('href="#s4"');
		expect(html).not.toContain('aria-current');
	});

	it('watches every heading against the reading line and the end of the text', () => {
		show();
		expect(line().targets.map(({ id }) => id)).toEqual(['s1', 's2', 's3', 's4']);
		expect(line().options?.rootMargin).toMatch(/ 0px -70% 0px$/);
		expect(tail().targets).toEqual([document.querySelector('#body')]);
	});

	it('marks exactly one entry: the first at the top, the one being read while scrolling, the last at the bottom', () => {
		show();
		scroll(0, { y: 0 });
		expect(marked()).toEqual(['1. Na kratko']);
		expect(
			screen.getAllByRole('link', { name: '1. Na kratko' }).map((a) => a.getAttribute('aria-current'))
		).toEqual(['location', 'location']);

		scroll(2);
		expect(marked()).toEqual(['2. Kdo je upravljavec']);
		scroll(3);
		expect(marked()).toEqual(['3. Katere podatke obdelujemo']);
		scroll(2);
		expect(marked()).toEqual(['2. Kdo je upravljavec']);

		// The last section is short: its heading never reaches the line, the end of the text does come into view.
		scroll(3, { end: true });
		expect(marked()).toEqual(['4. Spremembe']);
	});

	it('keeps the first entry at the top of a page short enough to show its end', () => {
		show();
		scroll(1, { end: true, y: 0 });
		expect(marked()).toEqual(['1. Na kratko']);
	});

	it('marks a clicked entry at once and keeps it through the jump, then follows the scroll again', () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		show();
		scroll(0, { y: 0 });

		const link = screen.getAllByRole('link', { name: '3. Katere podatke obdelujemo' })[1]!;
		expect(link.getAttribute('href')).toBe('#s3');
		fireEvent.click(link);
		expect(marked()).toEqual(['3. Katere podatke obdelujemo']);

		// Near the end the jump cannot bring the heading up to the line.
		scroll(2, { end: true });
		expect(marked()).toEqual(['3. Katere podatke obdelujemo']);

		vi.advanceTimersByTime(1000);
		scroll(1);
		expect(marked()).toEqual(['1. Na kratko']);
	});

	it('follows the scroll position the back button restores, even right after a click', () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		show();
		scroll(0, { y: 0 });
		fireEvent.click(screen.getAllByRole('link', { name: '3. Katere podatke obdelujemo' })[1]!);

		act(() => void window.dispatchEvent(new PopStateEvent('popstate')));
		scroll(2);
		expect(marked()).toEqual(['2. Kdo je upravljavec']);
	});

	it('scrolls the overflowing sticky list (never the page) to keep the current entry in view', () => {
		show();
		const nav = screen.getByRole('navigation', { name: 'Na tej strani' });
		const set = (el: Element, props: Record<string, number>) => {
			for (const [key, value] of Object.entries(props))
				Object.defineProperty(el, key, { value, writable: true, configurable: true });
		};
		// The sticky list's entries (not the disclosure's): 44 px high, 100 px apart, from 40 px.
		document
			.querySelectorAll('nav > div a')
			.forEach((a, i) => set(a, { offsetTop: 40 + i * 100, offsetHeight: 44 }));
		set(nav, { scrollTop: 0, clientHeight: 900, scrollHeight: 900 });

		scroll(2);
		expect(nav.scrollTop).toBe(0);

		// Shorter than its list: the last entry comes up to the bottom edge, one in view stays put, the first goes back.
		set(nav, { clientHeight: 300 });
		scroll(3, { end: true });
		expect(nav.scrollTop).toBe(340 + 44 - 300);
		scroll(3);
		expect(nav.scrollTop).toBe(84);
		scroll(1);
		expect(nav.scrollTop).toBe(40);
	});

	it('stops observing when it unmounts', () => {
		const { unmount } = show();
		unmount();
		expect(line().disconnected).toBe(true);
		expect(tail().disconnected).toBe(true);
	});
});
