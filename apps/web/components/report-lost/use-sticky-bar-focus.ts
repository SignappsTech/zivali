import * as React from 'react';

const below = '(max-width: 1023px)';

/**
 * Below lg the lost flow's Naprej/Objavi bar is sticky and covers the page bottom (WCAG 2.4.11). Feeds the bar's height
 * to `--lost-bar-h` (scroll-padding-bottom), and, because WebKit ignores scroll-padding for a control already in view,
 * scrolls by the overlap when a keyboard-focused control sits under the bar (the TASK-13.8 pattern).
 */
export function useStickyBarFocus(bar: React.RefObject<HTMLElement | null>, active: unknown) {
	React.useEffect(() => {
		const el = bar.current;
		if (!el) return;
		const root = document.documentElement;
		const sync = () => root.style.setProperty('--lost-bar-h', `${el.getBoundingClientRect().height}px`);
		sync();
		let frame = 0;
		const onFocusIn = (event: FocusEvent) => {
			const target = event.target;
			if (!(target instanceof Element) || el.contains(target)) return;
			if (typeof matchMedia === 'function' && !matchMedia(below).matches) return;
			try {
				if (!target.matches(':focus-visible')) return; // pointer focus: no jump on a mouse click
			} catch {
				// no :focus-visible support: check anyway
			}
			cancelAnimationFrame(frame);
			// A frame later: Chromium fires focusin before its own scroll-into-view.
			frame = requestAnimationFrame(() => {
				const box = target.getBoundingClientRect();
				const rect = el.getBoundingClientRect();
				if (rect.height > 0 && box.bottom > rect.top && box.top < rect.bottom) {
					window.scrollBy({ top: box.bottom - rect.top + 8, behavior: 'instant' });
				}
			});
		};
		document.addEventListener('focusin', onFocusIn);
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(sync);
		observer?.observe(el);
		return () => {
			document.removeEventListener('focusin', onFocusIn);
			cancelAnimationFrame(frame);
			observer?.disconnect();
			root.style.removeProperty('--lost-bar-h');
		};
	}, [bar, active]);
}
