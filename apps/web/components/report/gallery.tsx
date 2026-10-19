'use client';

import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { ImageBrokenIcon } from '@phosphor-icons/react/dist/ssr/ImageBroken';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import type { PublicPhoto } from '@zivali/types';
import { Button } from '@/components/ui/button';
import { photoCrop, photoWhole } from '@/lib/photo';
import { cn } from '@/lib/utils';

const frame = 'aspect-[4/3] w-full rounded-[calc(var(--radius)*2)]';

/**
 * P9 gallery (system §10 Gallery): the 4:3 photo (radius 32) and, with more than one photo, the 88x72 thumbnails
 * (radius 16, inactive at 55 %) with named previous and next buttons and a live "1 / 4". A photo that fails to load
 * becomes the placeholder tile (P9 S4). The first photo is the page's LCP, so it loads eagerly at high priority.
 */
export function Gallery({ photos, className }: { photos: PublicPhoto[]; className?: string }) {
	const t = useTranslations('report');
	const [index, setIndex] = React.useState(0);
	const [failed, setFailed] = React.useState<ReadonlySet<number>>(new Set());
	const main = React.useRef<HTMLImageElement>(null);
	const photo = photos[index]!;
	const total = photos.length;
	const fail = React.useCallback((i: number) => setFailed((set) => new Set(set).add(i)), []);
	const go = (step: number) => setIndex((i) => (i + step + total) % total);

	// A server-rendered photo can fail before hydration, when onError is not attached yet.
	React.useEffect(() => {
		const img = main.current;
		if (img?.complete && img.naturalWidth === 0) fail(0);
	}, [fail]);

	return (
		<div className={className}>
			{failed.has(index) ? (
				<div
					role="img"
					aria-label={t('photo_failed')}
					className={cn(frame, 'grid place-items-center bg-muted px-6 text-center text-muted-foreground')}
				>
					<div>
						<ImageBrokenIcon weight="bold" aria-hidden="true" className="mx-auto size-10" />
						<p className="mt-2">{t('photo_failed')}</p>
					</div>
				</div>
			) : (
				// eslint-disable-next-line @next/next/no-img-element -- public media URLs (C5), already sized by the API
				<img
					ref={main}
					key={photo.url}
					src={photo.url}
					alt={photo.alt}
					width={photo.width}
					height={photo.height}
					fetchPriority={index === 0 ? 'high' : undefined}
					onError={() => fail(index)}
					className={cn(frame, 'bg-muted', photoWhole)}
				/>
			)}
			{total > 1 && (
				<div className="mt-4 flex items-center gap-3">
					<ul className="-m-1 flex min-w-0 gap-3 overflow-x-auto p-1">
						{photos.map((thumb, i) => (
							<li key={thumb.url} className="shrink-0">
								<button
									type="button"
									aria-label={t('photo_thumb', { n: i + 1 })}
									aria-current={i === index ? 'true' : undefined}
									onClick={() => setIndex(i)}
									className="group block h-[72px] w-[88px] cursor-pointer rounded-lg bg-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
								>
									{/* eslint-disable-next-line @next/next/no-img-element -- an 88x72 thumbnail */}
									<img
										src={thumb.thumb_url}
										alt=""
										width={88}
										height={72}
										loading="lazy"
										className={cn(
											'size-full rounded-lg transition-opacity duration-150 motion-reduce:transition-none',
											photoCrop,
											i === index ? 'opacity-100' : 'opacity-55 group-hover:opacity-80'
										)}
									/>
								</button>
							</li>
						))}
					</ul>
					<div className="ml-auto flex shrink-0 items-center gap-1">
						<Button variant="ghost" size="icon" aria-label={t('photo_prev')} onClick={() => go(-1)}>
							<CaretLeftIcon weight="bold" aria-hidden="true" />
						</Button>
						<span
							aria-live="polite"
							className="min-w-10 text-center text-sm text-muted-foreground tabular-nums"
						>
							{t('photo_position', { n: index + 1, total })}
						</span>
						<Button variant="ghost" size="icon" aria-label={t('photo_next')} onClick={() => go(1)}>
							<CaretRightIcon weight="bold" aria-hidden="true" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
