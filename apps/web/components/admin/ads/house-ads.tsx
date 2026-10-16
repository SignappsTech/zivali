'use client';

import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useListAdminAdPagesInfiniteQuery, useSetAdStatusMutation } from '@zivali/api/ads';
import { flattenPages } from '@zivali/api/pagination';
import type { AdHouseKind, AdminAd } from '@zivali/types';
import { SpotIllustration } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

import { Region } from '../audit-log';
import { adminH1Class, useErrorText } from '../directory/parts';
import { AdForm } from './ad-form';
import { adPhase } from './format';
import { type AdMessages, PhaseLabel, type RegionNames, useNow } from './parts';

const KINDS: AdHouseKind[] = ['supporter', 'partner', 'adopt'];
const KIND_KEY = { supporter: 'house_kind_support', partner: 'house_kind_partner', adopt: 'house_kind_adopt' } as const;

/** One house ad (one language): preview, text, link, status, the switch that enables it and its edit form. */
function HouseRow({ ad, regions, messages }: { ad: AdminAd; regions: RegionNames; messages: AdMessages }) {
	const t = useTranslations('admin');
	const errorText = useErrorText();
	const now = useNow();
	const [editing, setEditing] = React.useState(false);
	const [setStatus, toggling] = useSetAdStatusMutation();
	const kind = t(KIND_KEY[ad.house_kind ?? 'supporter']);
	const language = ad.locales.map((locale) => locale.toUpperCase()).join(', ');
	const formId = React.useId();

	async function enable(on: boolean) {
		try {
			await setStatus({ id: ad.id, body: { status: on ? 'active' : 'paused' } }).unwrap();
			toast.success(t('saved_logged'));
		} catch (error) {
			toast.error(errorText(error));
		}
	}

	return (
		<li className="grid gap-2">
			<div className="flex flex-wrap items-start gap-5 rounded-row bg-card p-4 text-card-foreground">
				{ad.image_url ? (
					// eslint-disable-next-line @next/next/no-img-element -- the API's media URL, as AdUnit
					<img
						src={ad.image_url}
						alt={ad.image_alt}
						width={120}
						height={90}
						className="aspect-[4/3] w-30 shrink-0 rounded-row bg-muted object-cover"
					/>
				) : (
					<span aria-hidden="true" className="flex w-30 shrink-0 justify-center overflow-hidden rounded-row">
						<SpotIllustration className="aspect-[4/3] h-auto w-full rounded-none" />
					</span>
				)}
				<div className="min-w-0 flex-1 basis-60">
					<p className="text-sm text-muted-foreground">
						{kind} <span className="font-semibold">· {t('house_marker')}</span> · {language}
					</p>
					<p className="font-bold break-words">{ad.title}</p>
					<p className="line-clamp-2">{ad.body}</p>
					<p className="mt-1 text-sm break-all text-muted-foreground">
						{t('ads_link')}: <span className="tabular-nums">{ad.link_url}</span>
					</p>
				</div>
				<div className="flex flex-col items-end gap-2">
					<PhaseLabel phase={adPhase(ad, now)} />
					<label className="inline-flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
						<span>{t('house_enabled')}</span>
						<Switch
							aria-label={`${t('house_enabled')}: ${kind} (${language})`}
							checked={ad.status === 'active'}
							disabled={toggling.isLoading}
							onCheckedChange={(on) => void enable(on)}
						/>
					</label>
					<Button
						type="button"
						variant="secondary"
						size="sm"
						aria-expanded={editing}
						aria-controls={editing ? formId : undefined}
						aria-label={`${t('ads_action_edit')}: ${kind} (${language})`}
						onClick={() => setEditing(!editing)}
					>
						<PencilSimpleIcon weight="bold" aria-hidden="true" />
						{t('ads_action_edit')}
					</Button>
				</div>
			</div>
			{editing && (
				<div id={formId} className="max-w-[640px] rounded-row bg-card px-4 pt-6 pb-2 text-card-foreground">
					<AdForm
						ad={ad}
						house
						regions={regions}
						messages={messages}
						onDone={() => setEditing(false)}
						onCancel={() => setEditing(false)}
					/>
				</div>
			)}
		</li>
	);
}

/**
 * P20 house ads (admins, aal2): the three kinds (support, partner with us, adopt), one row per language, each enabled
 * on its own (status active or paused); editing uses the ad form with the slots locked and no targeting.
 */
export function HouseAds({ regions, messages }: { regions: RegionNames; messages: AdMessages }) {
	const t = useTranslations('admin');
	const query = useListAdminAdPagesInfiniteQuery({});
	const ads = flattenPages(query.data)
		.filter((ad) => ad.is_house)
		.sort(
			(a, b) =>
				KINDS.indexOf(a.house_kind ?? 'supporter') - KINDS.indexOf(b.house_kind ?? 'supporter') ||
				// SL first
				b.locales.join().localeCompare(a.locales.join())
		);
	// The house ads are the oldest rows, so on the last page: load them all.
	const { hasNextPage, isFetching, fetchNextPage } = query;
	React.useEffect(() => {
		if (hasNextPage && !isFetching) void fetchNextPage();
	}, [hasNextPage, isFetching, fetchNextPage]);
	return (
		<>
			<div className="grid gap-2">
				<h1 className={adminH1Class}>{t('house_title')}</h1>
				<p className="max-w-[60ch]">{t('house_body')}</p>
			</div>
			<div>
				<Region
					query={query}
					empty={
						ads.length === 0 &&
						!hasNextPage && (
							<p role="status" className="rounded-card bg-card px-4 py-10 text-center">
								{t('empty')}
							</p>
						)
					}
				>
					<ul className="grid gap-2">
						{ads.map((ad) => (
							<HouseRow key={ad.id} ad={ad} regions={regions} messages={messages} />
						))}
					</ul>
				</Region>
			</div>
		</>
	);
}
