import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The token type steps text-control and text-control-lg are font sizes, not colours; without this twMerge drops text colours.
const twMerge = extendTailwindMerge({
	extend: { classGroups: { 'font-size': [{ text: ['control', 'control-lg'] }] } },
});

/** shadcn class helper: joins conditional classes and lets the last Tailwind utility win. */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Focus on the first shown h1 in `root` (a flow step's question, so a screen reader starts there): now, or once it
 * appears when the step loads lazily. Returns the effect's cleanup.
 */
export function focusHeading(root: HTMLElement | null): (() => void) | undefined {
	if (!root) return;
	const focus = () => {
		const heading = Array.from(root.querySelectorAll('h1')).find((h1) => !h1.closest('[hidden]'));
		if (!heading) return false;
		heading.tabIndex = -1;
		heading.focus();
		return true;
	};
	if (focus()) return;
	const observer = new MutationObserver(() => focus() && observer.disconnect());
	observer.observe(root, { childList: true, subtree: true });
	return () => observer.disconnect();
}
