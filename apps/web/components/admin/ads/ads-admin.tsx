'use client';

import { CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { ImageSquareIcon } from '@phosphor-icons/react/dist/ssr/ImageSquare';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { StopCircleIcon } from '@phosphor-icons/react/dist/ssr/StopCircle';
import { TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useListAdminAdPagesInfiniteQuery } from '@zivali/api/ads';
import { flattenPages } from '@zivali/api/pagination';
import { AD_SLOTS, type AdminAd, REGION_SLUGS } from '@zivali/types';
import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/client-navigation';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

import { FilterPill, Paging, Region } from '../audit-log';
import { adminH1Class, type MenuItem, RowMenu, tdClass, thClass } from '../directory/parts';
import { adPhase, type Phase } from './format';
import { DeleteDialog, EndDialog, PhaseLabel, type RegionNames, useAdLabels, useNow } from './parts';

const PHASE_ORDER: Phase[] = ['running', 'scheduled', 'draft', 'paused', 'ended'];

/** 64 × 48 thumbnail with the ad's own alt text (content §7); a muted box when there is no image yet. */
export function Thumb({ ad, className }: { ad: AdminAd; className?: string }) {
	if (!ad.image_url)
		return (
			<span
				aria-hidden="true"
				className={cn(
					'grid h-12 w-16 shrink-0 place-items-center rounded-sm bg-muted text-muted-foreground',
					className
				)}
			>
				<ImageSquareIcon className="size-6" />
			</span>
		);
	return (
		// eslint-disable-next-line @next/next/no-img-element -- the API's media URL, as AdUnit
		<img
			src={ad.image_url}
			alt={ad.image_alt}
			width={64}
			height={48}
			className={cn('h-12 w-16 shrink-0 rounded-sm bg-muted object-cover', className)}
		/>
	);
}

/** Row actions (P20): edit, duplicate, end now, delete; an ended ad is read only, a draft has nothing to end. */
export function useAdActions(onEnd: (ad: AdminAd) => void, onDelete: (ad: AdminAd) => void) {
	const t = useTranslations('admin');
	const router = useRouter();
	return (ad: AdminAd, phase: Phase): MenuItem[] => [
		...(phase === 'ended'
			? []
			: [
					{
						label: t('ads_action_edit'),
						icon: PencilSimpleIcon,
						onSelect: () => router.push({ pathname: '/admin/ads/[id]/edit', params: { id: ad.id } }),
					},
				]),
		{
			label: t('ads_action_duplicate'),
			icon: CopyIcon,
			onSelect: () => router.push({ pathname: '/admin/ads/new', query: { from: ad.id } }),
		},
		...(phase === 'ended' || phase === 'draft'
			? []
			: [{ label: t('ads_action_end'), icon: StopCircleIcon, onSelect: () => onEnd(ad) }]),
		{ label: t('ads_action_delete'), icon: TrashIcon, onSelect: () => onDelete(ad), danger: true },
	];
}

/** P20 ads list (admins, aal2): sponsor ads with status, slots, targeting and dates; filters on the loaded pages. */
export function AdsAdmin({ regions }: { regions: RegionNames }) {
	const t = useTranslations('admin');
	const labels = useAdLabels(regions);
	const now = useNow();
	const query = useListAdminAdPagesInfiniteQuery({});
	const ads = flattenPages(query.data).filter((ad) => !ad.is_house);
	const [status, setStatus] = React.useState('');
	const [slot, setSlot] = React.useState('');
	const [region, setRegion] = React.useState('');
	const [species, setSpecies] = React.useState('');
	const [ending, setEnding] = React.useState<AdminAd>();
	const [deleting, setDeleting] = React.useState<AdminAd>();
	const actions = useAdActions(setEnding, setDeleting);

	const regionId = (REGION_SLUGS as readonly string[]).indexOf(region) + 1;
	const shown = ads
		.map((ad) => ({ ad, phase: adPhase(ad, now) }))
		.filter(
			({ ad, phase }) =>
				(!status || phase === status) &&
				(!slot || ad.slots.includes(slot as never)) &&
				// An ad for all of Slovenia runs in every region.
				(!regionId ||
					ad.region_ids?.includes(regionId) ||
					(!ad.region_ids?.length && !ad.municipality_ids?.length)) &&
				(!species || !ad.species?.length || ad.species.includes(species as never))
		);
	const filtered = Boolean(status || slot || region || species);
	const none = !query.isLoading && !query.isError && ads.length === 0;
	const clear = () => {
		setStatus('');
		setSlot('');
		setRegion('');
		setSpecies('');
	};
	const newAd = (
		<Button asChild size="lg">
			<Link href="/admin/ads/new">
				<PlusIcon weight="bold" aria-hidden="true" />
				{t('ads_new')}
			</Link>
		</Button>
	);

	return (
		<>
			<div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
				<h1 className={adminH1Class}>{t('ads_title')}</h1>
				{!none && newAd}
			</div>
			{!none && (
				<div role="group" aria-label={t('filters')} className="flex flex-wrap items-center gap-2">
					<FilterPill
						label={t('ads_col_status')}
						value={status}
						options={PHASE_ORDER.map((value) => ({ value, label: t(`ads_status_${value}`) }))}
						onChange={setStatus}
					/>
					<FilterPill
						label={t('ads_slots')}
						value={slot}
						options={AD_SLOTS.map((value) => ({ value, label: labels.slot(value) }))}
						onChange={setSlot}
					/>
					<FilterPill
						label={t('ads_regions')}
						value={region}
						options={Object.entries(regions)
							.map(([value, label]) => ({ value, label }))
							.sort((a, b) => a.label.localeCompare(b.label))}
						onChange={setRegion}
					/>
					<FilterPill
						label={t('ads_species')}
						value={species}
						options={(['dog', 'cat'] as const).map((value) => ({ value, label: labels.species(value) }))}
						onChange={setSpecies}
					/>
					{filtered && (
						<Button type="button" variant="text" size="sm" onClick={clear}>
							{t('filters_clear')}
						</Button>
					)}
				</div>
			)}
			<div>
				<Region
					query={query}
					empty={
						none ? (
							<div className="flex flex-col items-center gap-4 py-18 text-center">
								<span
									aria-hidden="true"
									className="grid size-18 place-items-center rounded-full bg-muted text-muted-foreground"
								>
									<ImageSquareIcon className="size-8" />
								</span>
								<p role="status" className="text-lg leading-7 font-bold">
									{t('ads_empty')}
								</p>
								{newAd}
							</div>
						) : (
							shown.length === 0 && (
								<div className="rounded-card bg-card px-4 py-10 text-center">
									<p role="status" className="font-display text-xl font-semibold">
										{t('empty')}
									</p>
									<Button
										type="button"
										variant="secondary"
										size="sm"
										className="mt-4"
										onClick={clear}
									>
										{t('filters_clear')}
									</Button>
								</div>
							)
						)
					}
				>
					<div className="rounded-card bg-card px-4 pt-1 pb-2 text-card-foreground">
						<table className="w-full border-collapse text-control leading-[22px] max-lg:hidden [&_tbody_tr:last-child>td]:border-b-0">
							<caption className="sr-only">{t('ads_title')}</caption>
							<thead>
								<tr>
									<th scope="col" className={thClass}>
										<span className="sr-only">{t('ads_col_preview')}, </span>
										{t('ads_col_title')}
									</th>
									<th scope="col" className={thClass}>
										{t('ads_col_status')}
									</th>
									<th scope="col" className={thClass}>
										{t('ads_col_slots')}
									</th>
									<th scope="col" className={thClass}>
										{t('ads_col_targeting')}
									</th>
									<th scope="col" className={thClass}>
										{t('ads_col_dates')}
									</th>
									<th scope="col" className={cn(thClass, 'w-13')}>
										<span className="sr-only">{t('row_actions')}</span>
									</th>
								</tr>
							</thead>
							<tbody>
								{shown.map(({ ad, phase }) => (
									<tr
										key={ad.id}
										className="transition-colors hover:bg-accent/60 motion-reduce:transition-none"
									>
										<td className={cn(tdClass, 'h-18')}>
											<div className="flex items-center gap-3">
												<Thumb ad={ad} />
												<AdLink ad={ad} />
											</div>
										</td>
										<td className={tdClass}>
											<PhaseLabel phase={phase} />
										</td>
										<td className={tdClass}>{labels.slots(ad)}</td>
										<td className={tdClass}>{labels.targeting(ad)}</td>
										<td className={cn(tdClass, 'whitespace-nowrap tabular-nums')}>
											{labels.period(ad)}
										</td>
										<td className={cn(tdClass, 'px-1 text-right')}>
											<RowMenu
												label={`${t('row_actions')}: ${ad.title}`}
												items={actions(ad, phase)}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
						<ul aria-label={t('ads_title')} className="lg:hidden [&>li:last-child]:border-b-0">
							{shown.map(({ ad, phase }) => (
								<li key={ad.id} className="flex items-start gap-3 border-b border-border py-3">
									<Thumb ad={ad} />
									<div className="min-w-0 flex-1">
										<AdLink ad={ad} />
										<p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
											<PhaseLabel phase={phase} />
											<span>{labels.slots(ad)}</span>
											<span className="tabular-nums">{labels.period(ad)}</span>
										</p>
									</div>
									<RowMenu label={`${t('row_actions')}: ${ad.title}`} items={actions(ad, phase)} />
								</li>
							))}
						</ul>
					</div>
					<Paging query={query} />
				</Region>
			</div>
			{ending && <EndDialog ad={ending} onClose={() => setEnding(undefined)} />}
			{deleting && <DeleteDialog ad={deleting} onClose={() => setDeleting(undefined)} />}
		</>
	);
}

function AdLink({ ad }: { ad: AdminAd }) {
	return (
		<Link
			href={{ pathname: '/admin/ads/[id]', params: { id: ad.id } }}
			className="inline-flex min-h-11 items-center rounded-sm text-left font-bold break-words hover:underline hover:decoration-2 hover:underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
		>
			{ad.title}
		</Link>
	);
}
