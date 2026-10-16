import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { FirstAidIcon } from '@phosphor-icons/react/dist/ssr/FirstAid';
import { HandHeartIcon } from '@phosphor-icons/react/dist/ssr/HandHeart';
import { HouseIcon } from '@phosphor-icons/react/dist/ssr/House';
import { PhoneIcon } from '@phosphor-icons/react/dist/ssr/Phone';
import { StethoscopeIcon } from '@phosphor-icons/react/dist/ssr/Stethoscope';
import { StorefrontIcon } from '@phosphor-icons/react/dist/ssr/Storefront';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

// P22 "Where your ad appears": one preview per slot in the merged P21 unit sizes (feed row 88, detail and reunited
// 200 / 176 from lg, sidebar 320 by 452), with the P21 house-ad and Vet Partner copy. Previews, not ads: no link, no
// `data-ad-slot`, nothing served or counted (this page carries no ad, P21). The house-ad images do not exist yet
// (TASK-36.1 to 36.3), so each image box shows a decorative icon in its crop.

const unitClass = 'block rounded-card bg-muted text-foreground';
const labelClass = 'block text-xs leading-4 font-bold text-muted-foreground';
const titleClass = 'block font-display text-lg leading-6 font-semibold tracking-[-0.01em]';
const bodyClass = 'block text-base leading-6';
const buttonClass = 'inline-flex min-h-11 items-center gap-2 -ml-3 px-3 font-bold text-primary';
const detailClass = cn(unitClass, 'min-h-[200px] p-4 lg:min-h-[176px]');

function ImageBox({ icon: Icon, className, large }: { icon: PhosphorIcon; className: string; large?: boolean }) {
	return (
		<span aria-hidden="true" className={cn('grid shrink-0 place-items-center rounded-row bg-card', className)}>
			<Icon className={cn('text-muted-foreground', large ? 'size-10' : 'size-7')} />
		</span>
	);
}

type Slot = 'feed' | 'detail' | 'reunited' | 'sidebar';

function Preview({ slot }: { slot: Slot }) {
	const t = useTranslations('partners');
	const label = useTranslations('ads')('label');

	switch (slot) {
		case 'feed':
			return (
				<div className={cn(unitClass, 'flex min-h-[88px] items-center gap-3 p-3')}>
					<ImageBox icon={HandHeartIcon} className="size-16" />
					<span className="min-w-0 flex-1">
						<span className={labelClass}>{label}</span>
						<span className={cn(titleClass, 'truncate')}>{t('preview_support_title')}</span>
						<span className={cn(bodyClass, 'truncate')}>{t('preview_support_body')}</span>
					</span>
					<CaretRightIcon
						weight="bold"
						aria-hidden="true"
						className="size-5 shrink-0 text-muted-foreground"
					/>
				</div>
			);
		case 'detail':
			// The Vet Partner unit (P21 V1): one line per mark, clipped rather than wrapped (`.ad-vet`).
			return (
				<div className={detailClass}>
					<span className={labelClass}>
						{label} <span aria-hidden="true">·</span> {t('preview_vet_context')}
					</span>
					<span className="mt-2 grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4">
						<ImageBox icon={StethoscopeIcon} className="size-24" />
						<span className="block min-w-0">
							<span className={cn(titleClass, 'line-clamp-2')}>{t('preview_vet_title')}</span>
							<span className="flex flex-nowrap gap-x-3 overflow-hidden">
								{(
									[
										[FirstAidIcon, 'preview_vet_24h'],
										[ClockIcon, 'preview_vet_open'],
									] as const
								).map(([Icon, key]) => (
									<span key={key} className="block min-w-0 truncate text-sm leading-5 font-bold">
										<Icon
											weight="fill"
											aria-hidden="true"
											className="mr-1.5 inline size-4 -translate-y-px align-middle text-primary"
										/>
										{t(key)}
									</span>
								))}
							</span>
							<span className={buttonClass}>
								<PhoneIcon weight="bold" aria-hidden="true" className="size-[18px]" />
								{t('preview_vet_cta')}
							</span>
						</span>
					</span>
				</div>
			);
		case 'reunited':
			return (
				<div className={detailClass}>
					<span className={labelClass}>{label}</span>
					<span className="mt-2 grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4">
						<ImageBox icon={HouseIcon} className="size-24" />
						<span className="block min-w-0">
							<span className={cn(titleClass, 'line-clamp-2')}>{t('preview_adopt_title')}</span>
							<span className={cn(bodyClass, 'line-clamp-2')}>{t('preview_adopt_body')}</span>
							<span className={cn(buttonClass, 'mt-1')}>{t('preview_adopt_cta')}</span>
						</span>
					</span>
				</div>
			);
		case 'sidebar':
			return (
				<div className={cn(unitClass, 'min-h-[452px] w-full max-w-[320px] p-4')}>
					<span className={cn(labelClass, 'mb-2')}>{label}</span>
					<ImageBox icon={StorefrontIcon} className="aspect-[4/3] w-full" large />
					<span className={cn(titleClass, 'mt-3 line-clamp-2')}>{t('preview_partner_title')}</span>
					<span className={cn(bodyClass, 'mt-1 line-clamp-3')}>{t('preview_partner_body')}</span>
					<span className={buttonClass}>{t('preview_partner_cta')}</span>
				</div>
			);
	}
}

const SLOTS = [
	['feed', 'slot_feed_title', 'slot_feed_body'],
	['detail', 'slot_detail_title', 'slot_detail_body'],
	['reunited', 'slot_reunited_title', 'slot_reunited_body'],
	['sidebar', 'slot_sidebar_title', 'slot_sidebar_body'],
] as const;

/** The four slots as a list: what and where on the left, the preview on the right from lg (P22 §3, no alternating). */
export function AdPreviews() {
	const t = useTranslations('partners');

	return (
		<ul className="grid gap-10 lg:gap-14">
			{SLOTS.map(([slot, title, body]) => (
				<li key={slot} className="grid gap-4 lg:grid-cols-12 lg:items-center lg:gap-12">
					<div className="lg:col-span-5">
						<h3 className="font-display text-xl leading-7 font-semibold">{t(title)}</h3>
						<p className="mt-2">{t(body)}</p>
					</div>
					<figure
						className="m-0 min-w-0 lg:col-span-7"
						aria-label={t('slot_preview_alt', { slot: t(title) })}
					>
						<Preview slot={slot} />
					</figure>
				</li>
			))}
		</ul>
	);
}
