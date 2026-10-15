import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The token type steps text-control and text-control-lg are font sizes, not colours; without this twMerge drops text colours.
const twMerge = extendTailwindMerge({
	extend: { classGroups: { 'font-size': [{ text: ['control', 'control-lg'] }] } },
});

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
