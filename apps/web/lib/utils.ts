import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn class helper: joins conditional classes and lets the last Tailwind utility win. */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
