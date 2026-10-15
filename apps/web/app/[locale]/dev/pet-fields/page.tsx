import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { env } from '@/lib/env';

import { PetFieldsDemo } from './demo';

export const metadata: Metadata = { title: 'PetFields', robots: { index: false, follow: false } };

/** TASK-16.4: the shared PetFields section in a bare form, for e2e, axe and review (SL /dev/pet-fields, EN /en/…). */
export default function PetFieldsDevPage() {
	if (env.APP_ENV === 'production') notFound();

	return (
		<main className="mx-auto grid w-full max-w-[640px] gap-8 px-5 py-8">
			<h1 className="font-display text-[34px] leading-10 font-bold tracking-[-0.02em]">PetFields</h1>
			<PetFieldsDemo />
		</main>
	);
}
