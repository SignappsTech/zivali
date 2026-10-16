'use client';

import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { HandHeartIcon } from '@phosphor-icons/react/dist/ssr/HandHeart';
import { ShareNetworkIcon } from '@phosphor-icons/react/dist/ssr/ShareNetwork';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import type { CreateReportResponse } from '@zivali/types';
import { Spot } from '@/components/auth/parts';
import { PrivateLinkBlock } from '@/components/manage/private-link';
import type { LatLng } from '@/components/map/map-view';
import { ShelterRow } from '@/components/shelters/shelter-row';
import { Button } from '@/components/ui/button';
import { getPathname, Link } from '@/i18n/navigation';

import type { Linked } from './found-form';

/**
 * After Publish (P7 M6, web W1; C5 for a sighting from a listing): the report is live (or being checked, `held_note`),
 * the private link for an anonymous finder (C7), the responsible-shelter row (not for the short sighting flow: the
 * owner is already notified), then Odpri mojo prijavo, the account offer and Deli. No tip, no ad. The QR code of the
 * private link is in its block. `point` is the coarsened one the report was sent with.
 */
export function FoundDone({
	result,
	point,
	kind,
	linked,
	emailed,
	titleClass,
}: {
	result: CreateReportResponse;
	point: LatLng;
	/** `found`: the finder has the animal; `sighted`: only saw it (the softer shelter row). */
	kind: 'found' | 'sighted';
	linked?: Linked;
	emailed: boolean;
	titleClass: string;
}) {
	const t = useTranslations('report_found');
	const tc = useTranslations('common');
	const locale = useLocale();
	const held = result.moderation_state === 'held';
	// Rendered only in the browser, after the submit.
	const [canShare] = React.useState(() => typeof navigator.share === 'function');
	const report = { pathname: '/r/[code]', params: { code: result.short_code } } as const;
	const share = () =>
		navigator.share({ url: `${window.location.origin}${getPathname({ locale, href: report })}` }).catch(() => {});

	return (
		<>
			<Spot>{linked ? <EyeIcon weight="bold" /> : <HandHeartIcon weight="bold" />}</Spot>
			<h1 className={titleClass}>{t(linked ? 'sighting_done_title' : 'done_title')}</h1>
			<p className="mt-3 text-lg leading-7 lg:mt-4 lg:text-xl lg:leading-8">
				{linked ? t('sighting_done_body') : t(held ? 'held_note' : 'done_body')}
			</p>
			{result.manage_token && (
				<div className="mt-8 lg:mt-10">
					<PrivateLinkBlock token={result.manage_token} emailed={emailed} />
				</div>
			)}
			{!linked && <ShelterRow point={point} kind={kind} className="mt-10" />}
			<div className="mt-10 flex flex-wrap items-center gap-2 max-sm:grid lg:mt-12">
				{linked ? (
					<Button asChild size="lg">
						{linked.code ? (
							<Link href={{ pathname: '/r/[code]', params: { code: linked.code } }}>{tc('close')}</Link>
						) : (
							<Link href="/">{tc('close')}</Link>
						)}
					</Button>
				) : (
					<>
						<Button asChild size="lg">
							<Link href={report}>{t('open_report')}</Link>
						</Button>
						{/* TODO(TASK-17.12): convert the anonymous session into an account instead of a plain sign-up. */}
						{result.manage_token && (
							<Button asChild variant="text">
								<Link href="/sign-up">{t('create_account')}</Link>
							</Button>
						)}
						{/* Not while it is held: nobody else can open it yet. */}
						{canShare && !held && (
							<Button variant="text" onClick={share}>
								<ShareNetworkIcon weight="bold" aria-hidden="true" />
								{t('share')}
							</Button>
						)}
					</>
				)}
			</div>
		</>
	);
}
