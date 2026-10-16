'use client';

import { CaretDownIcon } from '@phosphor-icons/react/dist/ssr/CaretDown';
import { CaretUpIcon } from '@phosphor-icons/react/dist/ssr/CaretUp';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { useLocale, useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import * as React from 'react';

import { useSession } from '@zivali/api/auth';
import type { Locale } from '@zivali/i18n/format';
import { rememberPayment, useAnswer } from '@/components/payments/answers';
import { Card, CardTitle } from '@/components/ui/card';
import { getPathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

// P15 support moments on web, as on mobile (apps/mobile/components/payments/support.tsx): the thank-you tip (reunited
// page), the contribution row (lost confirmation) and the Profile card. Voluntary and quiet: nothing pre-selected, Skip
// as visible as Pay, never for anonymous finders, and nothing here holds back reporting, matching or alerts.

// The ask is a chunk of its own: server-rendered where it shows at once (reunited, Profile), fetched only when the row
// opens on the lost confirmation, a public page. The payments client inside it loads only when Pay is pressed.
const AmountAsk = dynamic(() => import('@/components/payments/amount-ask').then((m) => m.AmountAsk));

const titleClass =
	'font-display text-xl leading-7 font-semibold tracking-[-0.01em] text-balance lg:text-2xl lg:leading-8';

/** P15 B6: replaces the tip block or the contribution row once this report has a contribution. */
function AlreadyPaid({ className }: { className?: string }) {
	const t = useTranslations('support');
	return (
		<p className={cn('flex gap-3', className)}>
			<CheckCircleIcon weight="fill" aria-hidden="true" className="size-[22px] shrink-0 text-primary" />
			<span className="min-w-0">{t('already_paid')}</span>
		</p>
	);
}

/** Skip removes the focused button: focus goes to the next stable element first (WCAG 2.4.3). */
const focusThen = (id: string | undefined, done: () => void) => {
	if (id) document.getElementById(id)?.focus();
	done();
};

type TipProps = {
	reportId: string;
	code: string;
	testMode: boolean;
	/** The element that takes focus when Preskoči removes the ask. */
	skipFocusId?: string;
	className?: string;
};

/**
 * P14/P15 thank-you tip on the owner's reunited page (a real account, checked by the page): h2 in the h3 role, one
 * sentence, 3, 5 (suggested) or 10 € or another amount. Preskoči ends the ask for this report; a payment leaves the
 * thank-you line.
 */
export function SupportTip({ reportId, code, testMode, skipFocusId, className }: TipProps) {
	const t = useTranslations('support');
	const locale = useLocale() as Locale;
	const key = `tip:${code}`;
	const [answer, setAnswer] = useAnswer(key);
	const id = React.useId();
	if (answer === 'skipped') return null;
	if (answer === 'paid') return <AlreadyPaid className={className} />;
	return (
		<section aria-labelledby={id} className={className}>
			<h2 id={id} className={titleClass}>
				{t('tip_title')}
			</h2>
			<p className="mt-3 max-w-[58ch]">{t('tip_body')}</p>
			<AmountAsk
				kind="tip"
				testMode={testMode}
				checkout={{
					purpose: 'tip',
					refs: { report_id: reportId },
					returnTo: getPathname({ locale, href: { pathname: '/r/[code]/reunited', params: { code } } }),
				}}
				onSkip={() => focusThen(skipFocusId, () => setAnswer('skipped'))}
				onCheckout={(paymentId) => rememberPayment(paymentId, key)}
			/>
		</section>
	);
}

/** Profile card "Pomagajte nam izboljšati Najdimo" (C13 `support`): the tip's amounts, no Skip, never a prompt. */
export function SupportCard({ testMode, className }: { testMode: boolean; className?: string }) {
	const t = useTranslations('support');
	const locale = useLocale() as Locale;
	return (
		<Card className={className}>
			<CardTitle asChild>
				<h2>{t('card_title')}</h2>
			</CardTitle>
			<p className="mt-3 max-w-[58ch]">{t('card_body')}</p>
			<AmountAsk
				kind="tip"
				testMode={testMode}
				checkout={{ purpose: 'support', returnTo: getPathname({ locale, href: '/account/payments' }) }}
			/>
		</Card>
	);
}

type RowProps = {
	/** The published report's id (C13 refs.report_id); Pay waits until it is known. */
	reportId?: string;
	code: string;
	testMode: boolean;
	/** The element that takes focus when Skrij removes the row. */
	skipFocusId?: string;
	className?: string;
};

/**
 * P15 contribution at the lost confirmation: a collapsed row (text and caret); open, the 2, 3 and 5 € pills with none
 * chosen, then Prispevaj and Skrij side by side. Skrij or a payment ends the ask for this report. Signed-in accounts
 * only.
 */
export function ContributionRow({ reportId, code, testMode, skipFocusId, className }: RowProps) {
	const t = useTranslations('support');
	const locale = useLocale() as Locale;
	const { me, isAnonymous } = useSession();
	const [open, setOpen] = React.useState(false);
	const key = `report_contribution:${code}`;
	const [answer, setAnswer] = useAnswer(key);
	const bodyId = React.useId();
	if (!me || isAnonymous || answer === 'skipped') return null;
	if (answer === 'paid') return <AlreadyPaid className={className} />;
	const Caret = open ? CaretUpIcon : CaretDownIcon;
	return (
		<div className={className}>
			<button
				type="button"
				aria-expanded={open}
				aria-controls={open ? bodyId : undefined}
				onClick={() => setOpen(!open)}
				className="-mx-3 box-content flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-row px-3 text-left font-semibold hover:bg-foreground/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
			>
				<HeartIcon weight="bold" aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
				<span className="min-w-0 flex-1">
					{t('contribution_row')}
					{!open && <span className="sr-only">. {t('contribution_expand_a11y')}</span>}
				</span>
				<Caret weight="bold" aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
			</button>
			{open && (
				<div id={bodyId}>
					<p className="mt-2">{t('contribution_body')}</p>
					<AmountAsk
						kind="contribution"
						testMode={testMode}
						checkout={
							reportId
								? {
										purpose: 'report_contribution',
										refs: { report_id: reportId },
										returnTo: getPathname({
											locale,
											href: { pathname: '/r/[code]', params: { code } },
										}),
									}
								: undefined
						}
						onSkip={() => focusThen(skipFocusId, () => setAnswer('skipped'))}
						onCheckout={(paymentId) => rememberPayment(paymentId, key)}
					/>
				</div>
			)}
		</div>
	);
}
