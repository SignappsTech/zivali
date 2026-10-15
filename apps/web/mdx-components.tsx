import type { MDXComponents } from 'mdx/types';

import { cn } from '@/lib/utils';

// Server-only element styling for the legal MDX (T4 Article style, 640 px measure).
const components: MDXComponents = {
	h2: (props) => <h2 {...props} className="mt-10 scroll-mt-6 font-display text-2xl font-bold first:mt-0" />,
	h3: (props) => <h3 {...props} className="mt-6 font-display text-xl font-bold" />,
	p: (props) => <p {...props} className="mt-4 leading-7" />,
	ul: (props) => <ul {...props} className="mt-4 list-disc space-y-2 pl-6 leading-7" />,
	ol: (props) => <ol {...props} className="mt-4 list-decimal space-y-2 pl-6 leading-7" />,
	a: ({ className, ...props }) => <a {...props} className={cn('underline underline-offset-4', className)} />,
	table: (props) => <table {...props} className="mt-4 w-full min-w-[560px] border-collapse text-left text-control" />,
	th: (props) => <th {...props} className="border-b border-border py-2 pr-4 align-top font-bold" />,
	td: (props) => <td {...props} className="border-b border-border py-2 pr-4 align-top" />,
	code: (props) => <code {...props} className="rounded bg-muted px-1 py-0.5 text-[0.9em] break-words" />,
};

export function useMDXComponents(): MDXComponents {
	return components;
}
