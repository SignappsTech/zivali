'use client';

import type { Icon } from '@phosphor-icons/react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { PauseCircleIcon } from '@phosphor-icons/react/dist/ssr/PauseCircle';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { PlayCircleIcon } from '@phosphor-icons/react/dist/ssr/PlayCircle';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { useDeleteAdMutation, useListAdminAdPagesInfiniteQuery, useSetAdStatusMutation } from '@zivali/api/ads';
import { flattenPages } from '@zivali/api/pagination';
import { formatCount, formatDate } from '@zivali/i18n/format';
import { type AdminAd, type AdSlot, REGION_SLUGS, type Species } from '@zivali/types';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { ErrorNote, useErrorText } from '../directory/parts';
import { endDay, type Phase } from './format';

/** Region names in the page's language, by slug (lib/partners.ts REGIONS, passed down by the server page). */
export type RegionNames = Record<string, string>;
/** The `ads` catalogue of both languages, for the preview (the console has only its own). */
export type AdMessages = { sl: Record<string, string>; en: Record<string, string> };

const PHASES: Record<Phase, { Icon: Icon; className: string }> = {
	running: { Icon: PlayCircleIcon, className: 'text-primary' },
	scheduled: { Icon: ClockIcon, className: 'text-foreground' },
	paused: { Icon: PauseCircleIcon, className: 'text-foreground' },
	draft: { Icon: PencilSimpleIcon, className: 'text-muted-foreground' },
	ended: { Icon: CheckCircleIcon, className: 'text-muted-foreground' },
};

/** Status as icon + word (system §10.5), never colour alone. */
export function PhaseLabel({ phase }: { phase: Phase }) {
	const t = useTranslations('admin');
	const { Icon: PhaseIcon, className } = PHASES[phase];
	return (
		<span className={cn('inline-flex items-center gap-1.5 text-sm font-bold whitespace-nowrap', className)}>
			<PhaseIcon weight="fill" aria-hidden="true" className="size-4 shrink-0" />
			{t(`ads_status_${phase}`)}
		</span>
	);
}

/** Now, once per mount: the status words and the default stats range read the same moment. */
export const useNow = () => React.useState(() => Date.now())[0];

/** Labels shared by the list, the form and the detail. */
export function useAdLabels(regions: RegionNames) {
	const t = useTranslations('admin');
	const locale = useLocale() as 'sl' | 'en';
	const slot = (value: AdSlot) => t(`ads_slot_${value}`);
	const species = (value: Species) => t(value === 'dog' ? 'ads_species_dogs' : 'ads_species_cats');
	const region = (slug: string | null) => (slug && regions[slug]) || t('ads_region_unknown');
	return {
		slot,
		species,
		region,
		slots: (ad: Pick<AdminAd, 'slots'>) => ad.slots.map(slot).join(', '),
		/** "Osrednjeslovenska · Psi"; nothing chosen is "all of Slovenia, all animals". */
		targeting: (ad: Pick<AdminAd, 'region_ids' | 'municipality_ids' | 'species'>) => {
			const places = (ad.region_ids ?? []).map((id) => region(REGION_SLUGS[id - 1] ?? null));
			const count = ad.municipality_ids?.length ?? 0;
			if (count) places.push(`${t('ads_municipalities')}: ${formatCount(count, locale)}`);
			const animals = (ad.species ?? []).map(species).join(', ');
			if (!places.length && !animals) return t('ads_targeting_all');
			return [places.join(', '), animals].filter(Boolean).join(' · ');
		},
		/** The run as dates; open ends are a dash. */
		period: (ad: Pick<AdminAd, 'starts_at' | 'ends_at'>) =>
			!ad.starts_at && !ad.ends_at
				? '–'
				: `${ad.starts_at ? formatDate(ad.starts_at, locale) : ''} – ${ad.ends_at ? formatDate(`${endDay(ad)}T12:00:00Z`, locale) : ''}`.trim(),
	};
}

/**
 * One ad by id from the admin list (C14 has no GET by id): the loaded pages first, then the next ones until it is
 * found or the list ends.
 */
export function useAdminAd(id: string) {
	const query = useListAdminAdPagesInfiniteQuery({});
	const ad = flattenPages(query.data).find((item) => item.id === id);
	const { hasNextPage, isFetching, fetchNextPage } = query;
	const more = !ad && hasNextPage && !isFetching;
	React.useEffect(() => {
		if (more) void fetchNextPage();
	}, [more, fetchNextPage]);
	// Still looking while a page loads, also the refetch after a save that created it.
	return { ad, query, searching: !ad && (isFetching || hasNextPage) };
}

/** P20 "Končaj zdaj": the ad stops at once, its statistics stay; focus starts on Cancel (Radix AlertDialog). */
export function EndDialog({ ad, onClose }: { ad: AdminAd; onClose: () => void }) {
	const t = useTranslations('admin');
	const errorText = useErrorText();
	const [setStatus, ending] = useSetAdStatusMutation();
	const [failure, setFailure] = React.useState<string>();
	async function confirm() {
		setFailure(undefined);
		try {
			await setStatus({ id: ad.id, body: { status: 'ended' } }).unwrap();
			toast.success(t('saved_logged'));
			onClose();
		} catch (error) {
			setFailure(errorText(error));
		}
	}
	return (
		<AlertDialog open onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent>
				<AlertDialogTitle>{t('ads_end_title')}</AlertDialogTitle>
				<AlertDialogDescription>{t('ads_end_body')}</AlertDialogDescription>
				{failure && (
					<div className="mt-4">
						<ErrorNote>{failure}</ErrorNote>
					</div>
				)}
				<AlertDialogFooter>
					<Button type="button" variant="destructive" loading={ending.isLoading} onClick={confirm}>
						{t('ads_action_end')}
					</Button>
					<AlertDialogCancel>{t('ads_cancel')}</AlertDialogCancel>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/** P20 delete: soft, with the audit note the API requires; the button stays off until it is filled. */
export function DeleteDialog({ ad, onClose }: { ad: AdminAd; onClose: () => void }) {
	const t = useTranslations('admin');
	const errorText = useErrorText();
	const [remove, removing] = useDeleteAdMutation();
	const [note, setNote] = React.useState('');
	const [failure, setFailure] = React.useState<string>();
	async function confirm() {
		setFailure(undefined);
		try {
			await remove({ id: ad.id, body: { note: note.trim() } }).unwrap();
			toast.success(t('saved_logged'));
			onClose();
		} catch (error) {
			setFailure(errorText(error));
		}
	}
	return (
		<AlertDialog open onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent>
				<AlertDialogTitle>{t('ads_delete_title')}</AlertDialogTitle>
				<AlertDialogDescription>{t('ads_delete_body')}</AlertDialogDescription>
				<FormField label={t('audit_note_required_label')} hint={t('audit_note_required_help')} className="mt-5">
					<Textarea rows={2} required value={note} onChange={(event) => setNote(event.target.value)} />
				</FormField>
				{failure && (
					<div className="mt-4">
						<ErrorNote>{failure}</ErrorNote>
					</div>
				)}
				<AlertDialogFooter>
					<Button
						type="button"
						variant="destructive"
						disabled={!note.trim()}
						loading={removing.isLoading}
						onClick={confirm}
					>
						{t('ads_action_delete')}
					</Button>
					<AlertDialogCancel>{t('ads_cancel')}</AlertDialogCancel>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/** A breakdown count: 1 to 4 read "< 5" (screen readers "fewer than 5"). */
export function Count({ value }: { value: number }) {
	const t = useTranslations('admin');
	const locale = useLocale() as 'sl' | 'en';
	if (value > 0 && value < 5)
		return (
			<>
				<span aria-hidden="true">{t('ads_under_5')}</span>
				<span className="sr-only">{t('ads_under_5_a11y')}</span>
			</>
		);
	return <>{formatCount(value, locale)}</>;
}

/** "2,2 %" (one decimal), or a dash when there is nothing to show. */
export function useCtrText() {
	const locale = useLocale();
	const format = new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'sl', {
		style: 'percent',
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	});
	return (ctr: number | null) => (ctr === null ? '–' : format.format(ctr));
}
