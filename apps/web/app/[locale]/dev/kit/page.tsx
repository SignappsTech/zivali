import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { env } from '@/lib/env';

import { Kit } from './kit';
import { samples } from './samples';

export const metadata: Metadata = { title: 'UI kit · Najdimo', robots: { index: false, follow: false } };

/** P23 UI kit gallery (TASK-8.2): every components/ui primitive in its states, SL at /dev/kit, EN at /en/dev/kit. */
export default async function KitPage({ params }: PageProps<'/[locale]/dev/kit'>) {
	// Dev and staging only (frontend.md: APP_ENV guards dev pages).
	if (env.APP_ENV === 'production') notFound();
	const { locale } = await params;

	return <Kit s={samples[locale === 'en' ? 'en' : 'sl']} locale={locale} />;
}
