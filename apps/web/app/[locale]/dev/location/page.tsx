import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { env } from '@/lib/env';

import { LocationDemo, type Mode } from './demo';

export const metadata: Metadata = { title: 'LocationPicker', robots: { index: false, follow: false } };

const MODES: Mode[] = ['lost', 'found', 'sighted', 'alert'];

/**
 * TASK-15.3: the web LocationPicker against the configured API, for e2e and review (SL /dev/location, EN
 * /en/dev/location). `?mode=found|sighted|alert` (default lost), `&exif=1` offers a photo location, `&stored=1` opens on
 * a stored point, `&dialog=1` shows the dialog variant behind a button.
 */
export default async function LocationDevPage({ searchParams }: PageProps<'/[locale]/dev/location'>) {
	if (env.APP_ENV === 'production') notFound();
	const params = await searchParams;
	const mode = MODES.find((m) => m === params.mode) ?? 'lost';

	return (
		<main className="mx-auto w-full max-w-[560px] px-4 py-8">
			<LocationDemo
				mode={mode}
				exif={params.exif === '1'}
				stored={params.stored === '1'}
				dialog={params.dialog === '1'}
			/>
		</main>
	);
}
