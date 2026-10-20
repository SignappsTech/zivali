'use client';

import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { ImageBrokenIcon } from '@phosphor-icons/react/dist/ssr/ImageBroken';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useTranslations } from 'next-intl';
import { Dialog as DialogPrimitive } from 'radix-ui';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogTitle, overlayClass } from '@/components/ui/dialog';
import { photoCrop, photoWhole } from '@/lib/photo';
import { cn } from '@/lib/utils';

/** A photo the gallery shows: a C5 `PublicPhoto`, or a pet photo whose thumb is its only file. */
export type LightboxPhoto = { url: string; thumb_url: string; alt: string; width?: number; height?: number };

/** A horizontal move shorter than this (px), or more vertical than horizontal, is a tap or a scroll, not a swipe. */
const SWIPE_PX = 40;
const STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

/** A photo that opens the gallery: the whole frame is the button, with the focus ring around it. */
export const openPhotoClass =
	'block w-full cursor-zoom-in focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';

/** The tile in place of a photo that does not load (P9 S4). */
export function PhotoFailed({ className }: { className?: string }) {
	const t = useTranslations('report');
	return (
		<div
			role="img"
			aria-label={t('photo_failed')}
			className={cn('grid place-items-center px-6 text-center text-muted-foreground', className)}
		>
			<div>
				<ImageBrokenIcon weight="bold" aria-hidden="true" className="mx-auto size-10" />
				<p className="mt-2">{t('photo_failed')}</p>
			</div>
		</div>
	);
}

/**
 * The 88x72 thumbnails (system §10.9 Gallery: radius 16, inactive at 55 %), each a button "Show photo n"; the selected
 * one is at full opacity with `aria-current`. Low priority: in view, Chrome would raise them to High beside the main
 * photo, the LCP (TASK-18.9).
 */
export function Thumbs({
	photos,
	index,
	onSelect,
	className,
	ref,
}: {
	photos: LightboxPhoto[];
	index: number;
	onSelect: (index: number) => void;
	className?: string;
	ref?: React.Ref<HTMLUListElement>;
}) {
	const t = useTranslations('report');
	return (
		<ul ref={ref} className={cn('flex gap-3 overflow-x-auto', className)}>
			{photos.map((thumb, i) => (
				<li key={thumb.url} className="shrink-0">
					<button
						type="button"
						aria-label={t('photo_thumb', { n: i + 1 })}
						aria-current={i === index ? 'true' : undefined}
						onClick={() => onSelect(i)}
						className="group block h-[72px] w-[88px] cursor-pointer rounded-lg bg-muted focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
					>
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
	);
}

/**
 * The fullscreen photo gallery (GH #4, #7), open at `index` while it is a number. The previous and next buttons, the
 * arrow keys and a swipe move round the set; the thumbnails mark the photo shown and "2 / 4" is announced politely.
 * A Radix dialog (system §10.9): focus is trapped, Escape and the close button close it, and focus goes back to what
 * opened it (a controlled dialog has no trigger to return to). Nothing of it is in the page while closed, so the large
 * files load only when it opens; a C5 `display.jpg` takes its `display.webp`, which the P9 gallery may have loaded.
 */
export function Lightbox({
	photos,
	index,
	onIndexChange,
}: {
	photos: LightboxPhoto[];
	index: number | null;
	onIndexChange: (index: number | null) => void;
}) {
	const t = useTranslations('report');
	const tCommon = useTranslations('common');
	const opener = React.useRef<HTMLElement | null>(null);
	const touchStart = React.useRef<{ x: number; y: number } | null>(null);
	const [failed, setFailed] = React.useState<ReadonlySet<string>>(new Set());
	const total = photos.length;
	const at = index ?? 0;
	const photo = index === null ? undefined : photos[index];
	const go = (step: number) => onIndexChange((at + step + total) % total);
	// The selected thumbnail stays in view on a narrow screen, also when the gallery opens at a later photo.
	const follow = React.useCallback(
		(strip: HTMLUListElement | null) => {
			strip?.children[at]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
		},
		[at]
	);

	return (
		<Dialog open={photo !== undefined} onOpenChange={(open) => !open && onIndexChange(null)}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className={overlayClass} />
				<DialogPrimitive.Content
					aria-modal="true"
					aria-describedby={undefined}
					onOpenAutoFocus={() => {
						opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
					}}
					onCloseAutoFocus={(event) => {
						event.preventDefault();
						opener.current?.focus();
					}}
					onKeyDown={(event) => {
						const step = STEPS[event.key];
						if (step) go(step);
					}}
					className="fixed inset-0 z-50 flex flex-col bg-background text-foreground outline-hidden transition-opacity duration-[220ms] starting:opacity-0 motion-reduce:duration-[80ms]"
				>
					{photo && (
						<>
							<div className="flex items-center gap-4 px-4 py-2 lg:px-6">
								<DialogTitle className="sr-only">{t('photos_title')}</DialogTitle>
								{total > 1 && (
									<p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
										{t('photo_position', { n: at + 1, total })}
									</p>
								)}
								<DialogClose asChild>
									<Button
										variant="ghost"
										size="icon"
										aria-label={tCommon('close')}
										className="ml-auto"
									>
										<XIcon weight="bold" aria-hidden="true" />
									</Button>
								</DialogClose>
							</div>
							<div
								className="relative min-h-0 flex-1"
								onTouchStart={(event) => {
									const touch = event.touches[0];
									touchStart.current =
										event.touches.length === 1 && touch
											? { x: touch.clientX, y: touch.clientY }
											: null;
								}}
								onTouchEnd={(event) => {
									const from = touchStart.current;
									const touch = event.changedTouches[0];
									touchStart.current = null;
									if (!from || !touch) return;
									const dx = touch.clientX - from.x;
									if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(touch.clientY - from.y))
										go(dx < 0 ? 1 : -1);
								}}
							>
								{failed.has(photo.url) ? (
									<PhotoFailed className="absolute inset-0" />
								) : (
									// eslint-disable-next-line @next/next/no-img-element -- public media URLs (C5), already sized by the API
									<img
										key={photo.url}
										src={photo.url}
										srcSet={
											photo.url.endsWith('.jpg')
												? photo.url.replace(/\.jpg$/, '.webp')
												: undefined
										}
										alt={photo.alt}
										width={photo.width}
										height={photo.height}
										onError={() => setFailed((set) => new Set(set).add(photo.url))}
										className={cn('absolute inset-0 size-full', photoWhole)}
									/>
								)}
								{total > 1 && (
									<>
										<Button
											variant="secondary"
											size="icon"
											aria-label={t('photo_prev')}
											onClick={() => go(-1)}
											className="absolute top-1/2 left-3 -translate-y-1/2 lg:left-6"
										>
											<CaretLeftIcon weight="bold" aria-hidden="true" />
										</Button>
										<Button
											variant="secondary"
											size="icon"
											aria-label={t('photo_next')}
											onClick={() => go(1)}
											className="absolute top-1/2 right-3 -translate-y-1/2 lg:right-6"
										>
											<CaretRightIcon weight="bold" aria-hidden="true" />
										</Button>
									</>
								)}
							</div>
							{total > 1 && (
								<Thumbs
									ref={follow}
									photos={photos}
									index={at}
									onSelect={onIndexChange}
									className="mx-auto w-fit max-w-full p-4"
								/>
							)}
						</>
					)}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</Dialog>
	);
}
