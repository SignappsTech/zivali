import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * P9 W9 loading: the final shape (photo, thumbnails, status, title, facts, main button), announced once. Mostly seen
 * on client navigation; document requests already carry their status from proxy.ts, so streaming changes no status.
 */
export default function Loading() {
	const t = useTranslations('common');

	return (
		<main
			id="main"
			aria-busy="true"
			className="mx-auto box-content max-w-[1120px] px-5 pt-2 pb-12 md:px-12 lg:pb-24"
		>
			<p role="status" className="sr-only">
				{t('loading')}
			</p>
			<div className="grid gap-y-10 lg:grid-cols-12 lg:gap-x-8">
				<div className="lg:col-span-7">
					<Skeleton className="h-11 w-48 rounded-full" />
					<Skeleton className="mt-3 aspect-[4/3] w-full rounded-[calc(var(--radius)*2)]" />
					<div className="mt-4 flex gap-3">
						{[0, 1, 2].map((i) => (
							<Skeleton key={i} className="h-[72px] w-[88px] rounded-lg" />
						))}
					</div>
				</div>
				<div className="lg:col-span-5 lg:pt-14">
					<Skeleton className="h-6 w-56" />
					<Skeleton className="mt-4 h-10 w-48 lg:h-16" />
					<Skeleton className="mt-3 h-6 w-52" />
					<div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5">
						{['w-32', 'w-24', 'w-36', 'w-28'].map((width) => (
							<div key={width}>
								<Skeleton className="h-4 w-16" />
								<Skeleton className={`mt-2 h-5 ${width}`} />
							</div>
						))}
					</div>
					<Skeleton className="mt-8 h-12 w-64" />
					<Skeleton className="mt-8 h-14 w-60 rounded-full" />
				</div>
			</div>
		</main>
	);
}
