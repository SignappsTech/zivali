import type { MDXComponents } from 'mdx/types';

import { LegalTable } from '@/components/legal/legal-table';
import { cn } from '@/lib/utils';

// Server-only element styling for the legal MDX (T4 Article style, 640 px measure). Tables go through <LegalTable>.
// Paragraphs stay plain <p> (styled by legalBodyClass), so LegalTable can unwrap the ones MDX puts in table cells.
const components: MDXComponents = {
	LegalTable,
	h2: (props) => <h2 {...props} className="mt-10 scroll-mt-6 font-display text-2xl font-bold first:mt-0" />,
	h3: (props) => <h3 {...props} className="mt-6 font-display text-xl font-bold" />,
	ul: (props) => <ul {...props} className="mt-4 list-disc space-y-2 pl-6 leading-7" />,
	ol: (props) => <ol {...props} className="mt-4 list-decimal space-y-2 pl-6 leading-7" />,
	a: ({ className, ...props }) => <a {...props} className={cn('underline underline-offset-4', className)} />,
	code: (props) => <code {...props} className="rounded bg-muted px-1 py-0.5 text-[0.9em] wrap-anywhere" />,
};

export function useMDXComponents(): MDXComponents {
	return components;
}
