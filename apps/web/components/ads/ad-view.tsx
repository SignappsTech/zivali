'use client';

import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { useTranslations } from 'next-intl';
import type * as React from 'react';

import type { Ad, AdSlot as Slot } from '@zivali/types';
import { ringClass, SpotIllustration } from '@/components/shell/page';
import { cn } from '@/lib/utils';

import { RESERVED } from './reserved';

/** "Oglas: title. body": the label once and the full text, even when the lines are clamped (P21, content §4). */
const a11yName = (label: string, body: string) => `${label}${/[.?!]$/.test(label) ? ' ' : '. '}${body}`;

const unitClass = cn(
	'block rounded-card bg-muted text-foreground hover:bg-[linear-gradient(hsl(var(--foreground)/0.08),hsl(var(--foreground)/0.08))]',
	ringClass
);
const labelClass = 'block text-xs leading-4 font-bold text-muted-foreground';
const titleClass = 'block font-display text-lg leading-6 font-semibold tracking-[-0.01em]';
const bodyClass = 'block text-base leading-6';
// The unit is the link: this is its visible text button, not a second target.
const buttonClass = 'inline-flex min-h-11 items-center -ml-3 px-3 font-bold break-words text-primary';
// The image boxes: the 1:1 crop of the 4:3 file (feed 64, detail and reunited 96), the sidebar's 4:3 on top.
const BOX = { feed: 'size-16', inline: 'size-24', sidebar: 'aspect-[4/3] w-full' } as const;
const PX = { feed: [64, 64], inline: [96, 96], sidebar: [288, 216] } as const;

function AdImage({ ad, box }: { ad: Ad; box: keyof typeof BOX }) {
	if (ad.image_url) {
		const [width, height] = PX[box];
		return (
			// The API serves the stored rendition (C14); next/image would proxy it again.
			// eslint-disable-next-line @next/next/no-img-element
			<img
				src={ad.image_url}
				alt={ad.image_alt}
				width={width}
				height={height}
				loading="lazy"
				decoding="async"
				className={cn('shrink-0 rounded-row bg-card object-cover', BOX[box])}
			/>
		);
	}
	// House ads have no image until TASK-36.1 to 36.3: the spot illustration, decorative, cropped like the image.
	// A sponsor without one gets the text-only unit (P21 S3).
	if (!ad.is_house) return null;
	return (
		<span aria-hidden="true" className={cn('flex shrink-0 justify-center overflow-hidden rounded-row', BOX[box])}>
			<SpotIllustration className="h-full w-auto max-w-none shrink-0 rounded-none" />
		</span>
	);
}

/**
 * The P21 unit (feed, detail, reunited, sidebar). With `href` it is the served link (AdUnit: our click counter, in a
 * new tab, sponsored). Without it, it is the admin preview (P20): the same unit drawn from the form, a labelled group
 * with no link, no request and no impression.
 */
export function AdView({
	ad,
	slot,
	href,
	className,
	ref,
	onClick,
}: {
	ad: Ad;
	slot: Slot;
	href?: string;
	className?: string;
} & Pick<React.ComponentProps<'a'>, 'ref' | 'onClick'>) {
	const t = useTranslations('ads');
	const label = <span className={labelClass}>{t('label')}</span>;
	const ctaText = ad.cta || t('learn_more');
	const cta = <span className={buttonClass}>{ctaText}</span>;
	// WCAG 2.5.3: the visible button text is part of the name (the feed row has none).
	const name = `${a11yName(t('unit_a11y', { title: ad.title }), ad.body)}${slot === 'feed' ? '' : ` ${ctaText}`}`;
	const classes = cn(unitClass, slot === 'feed' ? 'flex items-center gap-3 p-3' : 'p-4', RESERVED[slot], className);
	const content =
		slot === 'feed' ? (
			<>
				<AdImage ad={ad} box="feed" />
				<span className="min-w-0 flex-1">
					{label}
					<span className={cn(titleClass, 'truncate')}>{ad.title}</span>
					<span className={cn(bodyClass, 'truncate')}>{ad.body}</span>
				</span>
				<CaretRightIcon weight="bold" aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
			</>
		) : slot === 'sidebar' ? (
			<>
				<span className={cn(labelClass, 'mb-2')}>{t('label')}</span>
				<AdImage ad={ad} box="sidebar" />
				<span className={cn(titleClass, 'mt-3 line-clamp-2')}>{ad.title}</span>
				<span className={cn(bodyClass, 'mt-1 line-clamp-3')}>{ad.body}</span>
				{cta}
			</>
		) : (
			<>
				{label}
				<span className="mt-2 flex flex-wrap items-start gap-4">
					<AdImage ad={ad} box="inline" />
					<span className="block min-w-0 flex-1 basis-32">
						<span className={cn(titleClass, 'line-clamp-2 lg:line-clamp-1')}>{ad.title}</span>
						<span className={cn(bodyClass, 'line-clamp-2')}>{ad.body}</span>
						<span className="mt-1 block">{cta}</span>
					</span>
				</span>
			</>
		);

	if (!href)
		return (
			<div role="group" aria-label={name} className={classes}>
				{content}
			</div>
		);
	return (
		<a
			ref={ref}
			href={href}
			target="_blank"
			rel="sponsored noopener"
			aria-label={`${name} ${t('opens_new_tab')}`}
			data-ad-slot={slot}
			onClick={onClick}
			className={classes}
		>
			{content}
		</a>
	);
}
