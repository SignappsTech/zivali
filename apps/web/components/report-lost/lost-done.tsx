'use client';

import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { skipToken } from '@reduxjs/toolkit/query';
import { useLocale, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import * as React from 'react';
import { toast } from 'sonner';

import { type EventParams, track } from '@zivali/analytics';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useGetReportQuery } from '@zivali/api/reports';
import { formatDayMonth, type Locale } from '@zivali/i18n/format';
import type { Species } from '@zivali/types';
import { Spot } from '@/components/auth/parts';
import type { LatLng } from '@/components/map/map-view';
import { noteClass } from '@/components/shelters/classes';
import { ShelterRow } from '@/components/shelters/shelter-row';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { getPathname, Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/** The A4 poster PDF (C15), as on mobile (apps/mobile/lib/share.ts `posterUrl`), on this origin. */
const posterPath = (code: string, lang: Locale) => `/r/${code}/poster.pdf?lang=${lang}`;
/** The safety page's "first 24 hours" section (content P6 §10). */
const FIRST_24H = { sl: 'prvih-24-ur', en: 'first-24-hours' } as const;

const NEXT = [
	[BellIcon, 'next_1'],
	[ArrowsLeftRightIcon, 'next_2'],
	[ChatCircleIcon, 'next_3'],
] as const;

type LostDoneProps = {
	code: string;
	name?: string;
	species: Species;
	/** The coarsened point the report was sent with (C6). */
	point: LatLng;
	/** Signed in with the address not confirmed yet: alerts and messages wait for it (P16). */
	unverified: boolean;
	titleClass: string;
};

/**
 * P6 confirmation (M9) after a lost report is published, the web twin of the mobile LostDone: what happens next, the
 * responsible shelter with its call button and the owner's duty to report (the app never replaces it), the poster
 * (P18 PDF), share and the report, the first-24-hours tips, and the P15 contribution slot last. No ad (C15).
 * `share` and `poster_download` go through track(), a no-op without analytics consent (C12).
 */
export function LostDone({ code, name, species, point, unverified, titleClass }: LostDoneProps) {
	const t = useTranslations('report_lost');
	const ts = useTranslations('share');
	const tc = useTranslations('common');
	const locale = useLocale() as Locale;
	const id = React.useId();
	const { currentData: report, isError } = useGetReportQuery({ code });
	// The area name for the P18 share text: the reverse lookup of the public circle, never the owner's point.
	const area = useReversePlaceQuery(report ? { lat: report.area.lat, lng: report.area.lng } : skipToken).currentData
		?.label;

	const shared = (method: EventParams['share']['method']) => track('share', { method, report_type: 'lost', species });
	// The P18 text (as on mobile); without the area it needs, the link alone.
	const message = (url: string) => {
		if (!report || !area) return url;
		const values = { species, date: formatDayMonth(report.event_at, locale), area, url };
		return report.name ? ts('text_lost', { ...values, name: report.name }) : ts('text_lost_noname', values);
	};
	const share = async () => {
		const url = `${window.location.origin}/r/${code}`;
		try {
			if (navigator.share) {
				await navigator.share({ text: message(url) });
				shared('native');
			} else {
				await navigator.clipboard.writeText(url);
				toast.success(ts('copied'));
				shared('copy_link');
			}
		} catch {
			// The share sheet was closed, or the clipboard is not allowed: nothing to tell.
		}
	};
	const posterDownloaded = () => {
		// C12 `poster_download` needs the region; a report outside the 12 regions sends none.
		const region = report?.region_slug as EventParams['poster_download']['region'] | undefined;
		if (region) track('poster_download', { species, region });
	};

	return (
		<>
			<Spot className="mb-6">
				<MegaphoneIcon weight="bold" />
			</Spot>
			<h1 className={titleClass}>{t('done_title')}</h1>
			<p className="mt-3 text-lg leading-7">{name ? t('done_lede_named', { name }) : t('done_lede')}</p>
			{unverified && (
				<div className={cn(noteClass, 'mt-6')}>
					<InfoIcon weight="bold" aria-hidden="true" className="mt-px size-[22px] shrink-0" />
					<p>{t('unverified_note')}</p>
				</div>
			)}

			<h2 id={id} className="mt-10 font-display text-2xl leading-[30px] font-bold tracking-[-0.015em]">
				{t('next_title')}
			</h2>
			<ul aria-labelledby={id} className="mt-5 grid gap-4">
				{NEXT.map(([Icon, key]) => (
					<li key={key} className="flex gap-3.5">
						<Icon weight="bold" aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-primary" />
						{t(key)}
					</li>
				))}
			</ul>

			{/* By the municipality the API derived; the point only if the report cannot be read. */}
			<ShelterRow
				point={report || isError ? point : null}
				municipality={report?.municipality_slug}
				kind="lost"
				className="mt-8"
			/>

			<div className="mt-10 grid gap-1">
				<Button asChild size="lg">
					<a href={posterPath(code, locale)} download={`najdimo-${code}.pdf`} onClick={posterDownloaded}>
						<DownloadSimpleIcon weight="bold" aria-hidden="true" />
						{t('poster')}
					</a>
				</Button>
				<div className="grid grid-cols-2 gap-2">
					<Button variant="text" onClick={() => void share()}>
						<ShareNetworkIcon weight="bold" aria-hidden="true" />
						{t('share')}
					</Button>
					<Button asChild variant="text">
						<Link href={{ pathname: '/r/[code]', params: { code } }}>{t('open_report')}</Link>
					</Button>
				</div>
				<Button asChild variant="text" className="mt-2 justify-self-center">
					<NextLink href={`${getPathname({ locale, href: '/safety' })}#${FIRST_24H[locale]}`}>
						{t('first_24h')}
					</NextLink>
				</Button>
				{/* TODO(TASK-33.2): the P15 contribution row goes here, last: collapsed, nothing pre-selected, once per
				    report (support.contribution_*). No payment code before that task. */}
			</div>
			<Toaster closeLabel={tc('close')} label={tc('toasts_label')} />
		</>
	);
}
