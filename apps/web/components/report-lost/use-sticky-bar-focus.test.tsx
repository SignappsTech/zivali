import { cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useStickyBarFocus } from './use-sticky-bar-focus';

const rect = (top: number, bottom: number) =>
	({
		top,
		bottom,
		left: 0,
		right: 100,
		width: 100,
		height: bottom - top,
		x: 0,
		y: top,
		toJSON: () => ({}),
	}) as DOMRect;

function Bar() {
	const ref = useRef<HTMLDivElement>(null);
	useStickyBarFocus(ref, null);
	return <div ref={ref} />;
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('useStickyBarFocus', () => {
	it('scrolls a keyboard-focused control out from under the sticky bar, only then', () => {
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect(500, 600));
		const scrollBy = vi.fn();
		vi.spyOn(window, 'scrollBy').mockImplementation(scrollBy);
		let frames: FrameRequestCallback[] = [];
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
		const flush = () => {
			const run = frames;
			frames = [];
			run.forEach((cb) => cb(0));
		};
		render(<Bar />);
		expect(document.documentElement.style.getPropertyValue('--lost-bar-h')).toBe('100px');

		const control = (top: number, bottom: number, focusVisible = true) => {
			const button = document.createElement('button');
			button.getBoundingClientRect = () => rect(top, bottom);
			button.matches = (() => focusVisible) as unknown as typeof button.matches;
			document.body.append(button);
			return button;
		};
		const under = control(540, 584);
		const above = control(400, 444);
		const clicked = control(540, 584, false);
		for (const el of [above, clicked]) {
			el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
			flush();
		}
		expect(scrollBy).not.toHaveBeenCalled();
		under.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
		flush();
		expect(scrollBy).toHaveBeenCalledWith({ top: 92, behavior: 'instant' });
		[under, above, clicked].forEach((el) => el.remove());
	});
});
