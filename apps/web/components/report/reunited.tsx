'use client';

import { ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { AuthHeading } from '@/components/auth/parts';
import { DONE_ID, ReunitedAd, ReunitedTip } from '@/components/report/reunited-slots';
import type { DetailReport } from '@/components/report/slots/types';
import { StatusWord } from '@/components/report/status-word';
import { SpotIllustration } from '@/components/shell/page';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { getPathname, Link } from '@/i18n/navigation';
import { photoWhole } from '@/lib/photo';
import { cn } from '@/lib/utils';

// P14 reunited page (C15 /r/[code]/spet-doma, managers only), as on mobile (app/r/[code]/reunited.tsx): the owner's
// calm celebration with the story consent, the tip and ad slots and "Končano"; a finder gets the short thank-you (M7:
// no tip, no ad). No confetti, no motion.

const columnClass = 'mx-auto box-content max-w-[640px] px-5 pt-6 pb-16 md:px-12 lg:pb-24';

/**
 * W1, top to bottom: the spot illustration (decorative; stands in for assets/reunited-celebration.png, TASK-26.1), the
 * pet photo in its own 4:3 frame, h1 with the name (focused on arrival), one warm sentence, the story switch (off by
 * default: explicit consent, A-023), the tip slot (P15), the one ad slot (P21), "Končano" to the map and "Delite veselo
 * novico".
 */
function OwnerReunited({ report, tip, testMode }: { report: DetailReport; tip: boolean; testMode: boolean }) {
	const tl = useTranslations('lifecycle');
	const tb = useTranslations('browse');
	const ts = useTranslations('share');
	const te = useTranslations('errors');
	const tc = useTranslations('common');
	const locale = useLocale();
	const [story, setStory] = React.useState(false);
	const helpId = React.useId();
	const photo = report.photos[0];

	const share = async () => {
		const text = report.name ? tl('share_text_named', { name: report.name }) : tl('share_text');
		const url = `${window.location.origin}${getPathname({ locale, href: { pathname: '/r/[code]', params: { code: report.short_code } } })}`;
		if (navigator.share) return void navigator.share({ text, url }).catch(() => undefined);
		try {
			await navigator.clipboard.writeText(`${text} ${url}`);
			toast.success(ts('copied'));
		} catch {
			toast.error(te('INTERNAL'));
		}
	};

	return (
		<main id="main" className={columnClass}>
			<SpotIllustration />
			{photo && (
				// The API serves the sized display rendition (C5); next/image would proxy it again.
				// eslint-disable-next-line @next/next/no-img-element
				<img
					src={photo.url}
					alt={report.name ?? tb(`row_title_${report.type}`, { species: report.species })}
					width={photo.width}
					height={photo.height}
					className={cn('mt-6 aspect-[4/3] w-full rounded-[24px] bg-muted', photoWhole)}
				/>
			)}
			<div className="mt-10">
				<AuthHeading focus>
					{report.name ? tl('home_title_named', { name: report.name }) : tl('home_title')}
				</AuthHeading>
			</div>
			<p className="mt-3 max-w-[58ch] text-lg leading-7 lg:mt-4 lg:text-xl lg:leading-8">{tl('home_body')}</p>

			{/* The consent stays on this page for now: C4 has no field for it yet (CHANGE request); stories are M5. */}
			<div className="mt-10 rounded-row bg-card p-5">
				<label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 text-control-lg font-bold">
					{tl('story_label')}
					<Switch checked={story} onCheckedChange={setStory} aria-describedby={helpId} />
				</label>
				<p id={helpId} className="mt-2 max-w-[58ch] text-sm text-muted-foreground">
					{tl('story_help')}
				</p>
			</div>

			{tip && <ReunitedTip report={report} testMode={testMode} className="mt-16" />}
			<ReunitedAd report={report} tip={tip} className="mt-16" />

			<div className="mt-16 flex flex-wrap items-center gap-x-4 gap-y-2 max-sm:*:w-full">
				<Button asChild size="lg">
					<Link id={DONE_ID} href="/map">
						{tl('done')}
					</Link>
				</Button>
				<Button variant="text" onClick={() => void share()}>
					<ShareNetworkIcon weight="bold" aria-hidden="true" />
					{tl('share_news')}
				</Button>
			</div>
			<Toaster closeLabel={tc('close')} label={tc('toasts_label')} />
		</main>
	);
}

/** M7: the status word, one line of thanks; an anonymous finder gets the quiet account offer, nothing else. */
function FinderThanks({ report, anonymous }: { report: DetailReport; anonymous: boolean }) {
	const tl = useTranslations('lifecycle');
	return (
		<main id="main" className={columnClass}>
			<StatusWord report={report} />
			<div className="mt-2">
				<AuthHeading focus>{tl('finder_thanks_title')}</AuthHeading>
			</div>
			<p className="mt-3 text-lg leading-7 lg:text-xl lg:leading-8">{tl('finder_thanks_body')}</p>
			{anonymous && (
				<Button asChild variant="text" className="mt-8 -ml-3">
					<Link href={{ pathname: '/sign-up', query: { convert: '1' } }}>{tl('finder_thanks_account')}</Link>
				</Button>
			)}
		</main>
	);
}

type ReunitedProps = {
	report: DetailReport;
	/** The manage-link session (C7): no account, so no tip (P15). */
	anonymous: boolean;
	/** Payments off (the page's paymentsEnabled()): no tip, so the ad shows. */
	payments?: boolean;
	/** Outside production: the tip's test-payment note. */
	testMode?: boolean;
};

/** The reunited page of a report this viewer manages: the owner's celebration or the finder's thank-you. */
export function Reunited({ report, anonymous, payments = true, testMode = false }: ReunitedProps) {
	return report.manager_role === 'owner' ? (
		<OwnerReunited report={report} tip={!anonymous && payments} testMode={testMode} />
	) : (
		<FinderThanks report={report} anonymous={anonymous} />
	);
}
