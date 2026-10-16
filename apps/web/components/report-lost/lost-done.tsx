'use client';

import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { ChatCircleIcon } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import { skipToken } from '@reduxjs/toolkit/query';
import { useLocale, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import * as React from 'react';

import { type EventParams, track } from '@zivali/analytics';
import { useReversePlaceQuery } from '@zivali/api/geocode';
import { useGetReportQuery } from '@zivali/api/reports';
import { formatDayMonth, type Locale } from '@zivali/i18n/format';
import type { Species } from '@zivali/types';
import { Spot } from '@/components/auth/parts';
import { ContributionRow } from '@/components/payments/support';
import type { LatLng } from '@/components/map/map-view';
import { ContentDialog, PosterOptions, ShareMenu } from '@/components/report/share-menu';
import { noteClass } from '@/components/shelters/classes';
import { ShelterRow } from '@/components/shelters/shelter-row';
import { Button } from '@/components/ui/button';
import { getPathname, Link } from '@/i18n/navigation';
import { env } from '@/lib/env';
import { posterFileName, posterPath, reportLink, squarePath } from '@/lib/poster-link';
import { cn } from '@/lib/utils';

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
	/** Outside production: the contribution row's test-payment note. */
	testMode?: boolean;
};

/**
 * P6 confirmation (M9) after a lost report is published, the web twin of the mobile LostDone: what happens next, the
 * responsible shelter with its call button and the owner's duty to report (the app never replaces it), the poster
 * (P18 PDF), share and the report, the first-24-hours tips, and the P15 contribution slot last. No ad (C15).
 * `share` and `poster_download` go through track(), a no-op without analytics consent (C12).
 */
export function LostDone({ code, name, species, point, unverified, titleClass, testMode = false }: LostDoneProps) {
	const t = useTranslations('report_lost');
	const ts = useTranslations('share');
	const tt = useTranslations();
	const locale = useLocale() as Locale;
	const id = React.useId();
	const { currentData: report, isError } = useGetReportQuery({ code });
	// The area name for the P18 share text: the reverse lookup of the public circle, never the owner's point.
	const area = useReversePlaceQuery(report ? { lat: report.area.lat, lng: report.area.lng } : skipToken).currentData
		?.label;

	const [posterOpen, setPosterOpen] = React.useState(false);
	const url = reportLink(code);
	const region = report?.region_slug as EventParams['poster_download']['region'] | undefined;
	// The P18 text (as on mobile); without the area it needs, the link alone.
	const values = report && area ? { species, date: formatDayMonth(report.event_at, locale), area, url } : undefined;
	const message = values
		? report?.name
			? ts('text_lost', { ...values, name: report.name })
			: ts('text_lost_noname', values)
		: url;
	// The owner's Facebook kit, when the area is known (P18 W2).
	const kitText = (key: 'kit_post_text' | 'kit_media_text') =>
		values && report?.name ? ts(key, { ...values, name: report.name }) : message;
	const posterDownloaded = () => {
		// C12  needs the region; a report outside the 12 regions sends none.
		if (region) track('poster_download', { species, region });
	};
	const copy = {
		button: t('share'),
		copy: tt('report.share_copy'),
		whatsapp: tt('report.share_whatsapp'),
		facebook: tt('report.share_facebook'),
		more: ts('more'),
		poster: tt('report.share_poster'),
		copied: ts('copied'),
		unsupported: ts('unsupported'),
		copyFailed: ts('copy_failed'),
		close: tt('common.close'),
		opensNewTab: tt('common.opens_new_tab'),
		languageLabel: tt('poster.language_label'),
		languageSl: tt('poster.language_sl'),
		languageEn: tt('poster.language_en'),
		download: tt('poster.download'),
		preparing: tt('poster.preparing'),
		readyFile: tt('poster.ready_file', { filename: posterFileName(code) }),
		print: tt('poster.print'),
		qrNote: tt('poster.qr_note'),
		noPhoto: tt('poster.no_photo'),
		failed: tt('poster.failed'),
		tryAgain: tt('common.try_again'),
		reunited: tt('browse.status_reunited'),
		kitTitle: ts('kit_title'),
		kitIntro: ts('kit_intro'),
		kitPostTitle: ts('kit_post_title'),
		kitCopy: ts('kit_copy'),
		kitCopied: ts('kit_copied'),
		kitImageTitle: ts('kit_image_title'),
		kitImageSave: ts('kit_image_save'),
		kitImageAlt: ts('kit_image_alt', { title: [t('done_title'), name].filter(Boolean).join(' ') }),
		kitGroupsTitle: ts('kit_groups_title'),
		kitGroupsIntro: ts('kit_groups_intro'),
		kitGroupsHint: ts('kit_groups_hint'),
		kitMediaTitle: ts('kit_media_title'),
		kitMediaIntro: ts('kit_media_intro'),
		kitMediaHint: ts('kit_media_hint'),
		kitMediaForm: ts('kit_media_form'),
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
				<Button size="lg" aria-haspopup="dialog" onClick={() => setPosterOpen(true)}>
					<DownloadSimpleIcon weight="bold" aria-hidden="true" />
					{t('poster')}
				</Button>
				<div className="grid grid-cols-2 gap-2">
					<ShareMenu
						url={url}
						message={message}
						analytics={{ report_type: 'lost', species, region }}
						poster={{
							href: { sl: posterPath(code, 'sl'), en: posterPath(code, 'en') },
							fileName: posterFileName(code),
							lang: locale,
							photo: true,
							reunited: false,
						}}
						kit={
							values
								? {
										post: kitText('kit_post_text'),
										media: kitText('kit_media_text'),
										image: squarePath(code, locale),
										imageName: `najdimo-${code}.png`,
										configUrl: `${env.NEXT_PUBLIC_API_URL}/v1/config/public`,
									}
								: null
						}
						copy={copy}
					/>
					<Button asChild variant="text">
						<Link href={{ pathname: '/r/[code]', params: { code } }}>{t('open_report')}</Link>
					</Button>
				</div>
				<Button asChild variant="text" className="mt-2 justify-self-center">
					<NextLink
						id="lost-first-24h"
						href={`${getPathname({ locale, href: '/safety' })}#${FIRST_24H[locale]}`}
					>
						{t('first_24h')}
					</NextLink>
				</Button>
				{/* P15, last: collapsed, nothing chosen, once per report; its ask and the payments client load on demand. */}
				<ContributionRow
					reportId={report?.id}
					code={code}
					testMode={testMode}
					skipFocusId="lost-first-24h"
					className="mt-6"
				/>
			</div>
			{posterOpen && (
				<ContentDialog title={copy.poster} closeLabel={copy.close} onClose={() => setPosterOpen(false)}>
					<PosterOptions
						poster={{
							href: { sl: posterPath(code, 'sl'), en: posterPath(code, 'en') },
							fileName: posterFileName(code),
							lang: locale,
							photo: true,
							reunited: false,
						}}
						copy={copy}
						onDownload={posterDownloaded}
					/>
				</ContentDialog>
			)}
		</>
	);
}
