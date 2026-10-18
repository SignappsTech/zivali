'use client';

import { useEffect, useRef, useState } from 'react';

const linkClass =
	'inline-flex min-h-11 items-center rounded-lg underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=location]:underline aria-[current=location]:decoration-primary aria-[current=location]:decoration-2';

// Far enough to reach the top of the longest page: the root then runs from above the page down to the reading line.
const FAR = '100000px';

/**
 * T4 Legal "On this page" (sticky from lg, a disclosure below) with the section being read marked like the header nav
 * (`aria-current="location"`): the last heading above the reading line, 30 % down the viewport; the first before any;
 * the last once the end of the text is in view. Only IntersectionObservers, no scroll listeners. A click marks its
 * entry at once and the hash jump does the scrolling (instant, so nothing to reduce). Server-rendered without a mark,
 * so without JS these are the plain #links.
 */
export function LegalToc({ label, headings }: { label: string; headings: { id: string; text: string }[] }) {
	const [current, setCurrent] = useState<string>();
	const clicked = useRef({ id: '', at: 0 });
	const nav = useRef<HTMLElement>(null);
	const sticky = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const heads = headings.flatMap(({ id }) => document.getElementById(id) ?? []);
		const first = heads[0];
		const last = heads.at(-1);
		const body = last?.parentElement;
		if (!first || !last || !body || typeof IntersectionObserver === 'undefined') return;

		const above = new Set<Element>();
		let end = false;
		const mark = (isAbove: (head: Element) => boolean, atEnd: boolean) =>
			setCurrent((atEnd && window.scrollY > 0 ? last : (heads.findLast(isAbove) ?? first)).id);
		// A click near the end jumps less far than its heading needs; that jump must not move the click's mark.
		const pinned = () => Date.now() - clicked.current.at < 300;
		const update = () => {
			if (!pinned()) mark((h) => above.has(h), end);
		};
		const line = new IntersectionObserver(
			(entries) => {
				for (const entry of entries)
					if (entry.isIntersecting) above.add(entry.target);
					else above.delete(entry.target);
				update();
			},
			{ rootMargin: `${FAR} 0px -70% 0px` }
		);
		// The root starts at the viewport's bottom edge: the text still reaching into it means its end is not in view.
		const tail = new IntersectionObserver(
			(entries) => {
				end = !entries.at(-1)!.isIntersecting;
				update();
			},
			{ rootMargin: `-100% 0px ${FAR} 0px` }
		);
		// Back and forward restore a scroll position, even right after a click, and maybe before the observers ever saw
		// its jump (then they report no change): end the pin and read the position once, by the observers' rules.
		// Chromium fires popstate before the restore and hashchange after it, and both for a click's own jump too: those
		// carry the clicked hash and keep its mark.
		const restore = () => {
			if (pinned() && location.hash === `#${clicked.current.id}`) return;
			clicked.current.at = 0;
			const height = window.innerHeight;
			mark((h) => h.getBoundingClientRect().top <= height * 0.3, body.getBoundingClientRect().bottom < height);
		};
		heads.forEach((head) => line.observe(head));
		tail.observe(body);
		window.addEventListener('popstate', restore);
		window.addEventListener('hashchange', restore);
		return () => {
			line.disconnect();
			tail.disconnect();
			window.removeEventListener('popstate', restore);
			window.removeEventListener('hashchange', restore);
		};
	}, [headings]);

	// From lg a list taller than the viewport scrolls inside the sticky nav: keep the current entry in it. By hand, as
	// scrollIntoView would also scroll the page while the nav is pushed up at the end of the text.
	useEffect(() => {
		const box = nav.current;
		const link = sticky.current?.querySelector<HTMLElement>('[aria-current]');
		if (!box || !link || box.scrollHeight <= box.clientHeight) return;
		// The sticky nav is the link's offsetParent.
		const top = link.offsetTop;
		box.scrollTop = Math.min(Math.max(box.scrollTop, top + link.offsetHeight - box.clientHeight), top);
	}, [current]);

	const list = (
		<ol className="grid gap-0.5">
			{headings.map(({ id, text }) => (
				<li key={id}>
					<a
						href={`#${id}`}
						aria-current={id === current ? 'location' : undefined}
						className={linkClass}
						onClick={() => {
							clicked.current = { id, at: Date.now() };
							setCurrent(id);
						}}
					>
						{text}
					</a>
				</li>
			))}
		</ol>
	);

	return (
		<nav
			ref={nav}
			aria-label={label}
			className="print:hidden lg:sticky lg:top-6 lg:-mx-2 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto lg:px-2 lg:pb-2"
		>
			<details className="mb-6 rounded-row bg-muted px-[18px] lg:hidden">
				<summary className="min-h-11 cursor-pointer py-3 font-bold">{label}</summary>
				<div className="pb-3">{list}</div>
			</details>
			<div className="hidden lg:block">
				<p className="font-bold">{label}</p>
				<div ref={sticky} className="mt-2">
					{list}
				</div>
			</div>
		</nav>
	);
}
