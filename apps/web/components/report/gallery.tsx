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
 * The main photo's files, smallest first (C5: `thumb.webp`, 480 px long edge, and `display.webp` beside `url`, the
 * `display.jpg` fallback), and the width it shows at: the frame (P9 columns: 100vw less the page padding, 640 px from
 * lg), or the share of it that a taller photo fills, as it is shown whole. Phones then load the thumb, not 300 KB.
 * The thumb counts 5 % wider than it is: Chrome takes the first file that covers the screen, so a 412 px phone at
 * DPR 1.75 (Lighthouse's Moto G) wanted 366 px of a 360 px thumb and loaded the 176 KB display (TASK-18.9). An
 * upscale of up to 5 % does not show.
 */
export function photoSources({ url, thumb_url, width, height }: PublicPhoto) {
	const thumbWidth = Math.round(width * Math.min(1, 480 / Math.max(width, height)));
	const fill = +Math.min(1, (0.75 * width) / height).toFixed(4);
	const files = [`${url.replace(/\.jpg$/, '.webp')} ${width}w`];
	if (thumbWidth < width) files.unshift(`${thumb_url} ${Math.round(thumbWidth * 1.05)}w`);
	return {
		srcSet: files.join(', '),
		sizes: `(min-width: 1024px) ${Math.round(640 * fill)}px, (min-width: 768px) calc((100vw - 96px) * ${fill}), calc((100vw - 40px) * ${fill})`,
	};
}

/**
 * P9 gallery (system §10 Gallery): the 4:3 photo (radius 32) and, with more than one photo, the 88x72 thumbnails
 * (radius 16, inactive at 55 %) with named previous and next buttons and a live "1 / 4". A photo that fails to load
 * becomes the placeholder tile (P9 S4). The first photo is the page's LCP, so it loads eagerly at high priority, in
 * the size the screen needs (`photoSources`).
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
					{...photoSources(photo)}
					alt={photo.alt}
					width={photo.width}
					height={photo.height}
					fetchPriority={index === 0 ? 'high' : undefined}
					onError={() => fail(index)}
					className={cn(frame, 'bg-muted', photoWhole)}
				/>
			)}
			{total > 1 && (
				<div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
					<ul className="-m-1 flex min-w-0 flex-1 basis-24 gap-3 overflow-x-auto p-1">
						{photos.map((thumb, i) => (
							<li key={thumb.url} className="shrink-0">
								<button
									type="button"
									aria-label={t('photo_thumb', { n: i + 1 })}
									aria-current={i === index ? 'true' : undefined}
									onClick={() => setIndex(i)}
									className="group block h-[72px] w-[88px] cursor-pointer rounded-lg bg-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
								>
									{/* Low: in view, Chrome would raise them to High beside the main photo, the LCP (TASK-18.9). */}
									{/* eslint-disable-next-line @next/next/no-img-element -- an 88x72 thumbnail */}
									<img
										src={thumb.thumb_url}
										alt=""
										width={88}
										height={72}
										loading="lazy"
										fetchPriority="low"
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
