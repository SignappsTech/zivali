import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PhotoPicker } from '@/components/photos/photo-picker';
import { env } from '@/lib/env';

export const metadata: Metadata = { title: 'PhotoPicker · Najdimo', robots: { index: false, follow: false } };

/** TASK-14.2: the PhotoPicker against the configured API, for e2e and review (SL /dev/photos, EN /en/dev/photos). */
export default function PhotosDevPage() {
	if (env.APP_ENV === 'production') notFound();

	return (
		<main className="mx-auto grid w-full max-w-[560px] gap-6 px-5 py-8">
			<h1 className="font-display text-[34px] leading-10 font-bold tracking-[-0.02em]">PhotoPicker</h1>
			<PhotoPicker draft="dev" />
		</main>
	);
}
