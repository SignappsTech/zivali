'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { CONSENT_VERSION, getConsent, needsConsentPrompt, setConsent } from '@zivali/analytics';
import { Link } from '@/i18n/navigation';

/** The footer's "Cookie settings" button dispatches this on `window`; the banner opens the Customise view. */
export const OPEN_COOKIE_SETTINGS = 'zz:cookie-settings';

// P17: three equal secondary buttons (none is primary), no animation, plain classes: no Radix, no cva, a small chunk.
const button =
	'inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-button bg-secondary px-4 text-center text-base font-bold text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-pressed focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';
const textButton =
	'-ml-3 inline-flex min-h-11 cursor-pointer items-center rounded-button px-3 text-base font-bold text-primary hover:bg-foreground/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring';
const sw =
	'relative h-8 w-14 shrink-0 cursor-pointer appearance-none rounded-full bg-input before:absolute before:top-1 before:left-1 before:size-6 before:rounded-full before:bg-card before:ring-1 before:ring-border before:transition-transform checked:bg-primary checked:before:translate-x-6 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted motion-reduce:before:transition-none';

type View = 'closed' | 'first' | 'custom';

/**
 * P17 consent banner (web): bottom-left card on lg, bottom sheet below. A non-modal labelled dialog, shown after
 * hydration only (the choice lives in a cookie, so the server cannot know), focus on its heading. Escape or ignoring it
 * keeps everything denied. Opened from the footer, it starts in the Customise view with the stored choice.
 */
export function ConsentBanner() {
	const t = useTranslations('consent');
	const [view, setView] = useState<View>('closed');
	const [analytics, setAnalytics] = useState(false);
	const [saved, setSaved] = useState(false);
	const [fromSettings, setFromSettings] = useState(false);
	const [reask, setReask] = useState<string | null>(null);
	const heading = useRef<HTMLHeadingElement>(null);
	const opener = useRef<HTMLElement | null>(null);

	useEffect(() => {
		// The choice is a cookie the server cannot see: decided after hydration, so the banner never touches the LCP.
		const stored = getConsent();
		const key = `change_${CONSENT_VERSION}` as never; // a short phrase added to both catalogues with each bump
		if (needsConsentPrompt()) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setView('first');
			if (stored)
				setReask(
					stored.v !== CONSENT_VERSION && t.has(key)
						? t('reask_changed', { change: t(key) })
						: t('reask_year')
				);
		}
		const open = () => {
			opener.current = document.activeElement as HTMLElement | null;
			setAnalytics(getConsent()?.analytics ?? false);
			setSaved(false);
			setFromSettings(true);
			setView('custom');
		};
		window.addEventListener(OPEN_COOKIE_SETTINGS, open);
		return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, open);
	}, [t]);

	useEffect(() => {
		if (view !== 'closed') heading.current?.focus();
	}, [view]);

	useEffect(() => {
		if (!saved) return;
		const timer = setTimeout(() => setSaved(false), 5000);
		return () => clearTimeout(timer);
	}, [saved]);

	const close = () => {
		setView('closed');
		setFromSettings(false);
		opener.current?.focus();
		opener.current = null;
	};
	const choose = (value: boolean) => {
		setConsent({ analytics: value });
		setReask(null);
		setSaved(fromSettings);
		close();
	};
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') close();
	};

	return (
		<>
			<div role="status" className="sr-only">
				{saved ? t('saved_toast') : ''}
			</div>
			{saved && (
				<p
					aria-hidden="true"
					className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-button bg-foreground px-5 py-3 text-center font-bold text-background shadow-lg"
				>
					{t('saved_toast')}
				</p>
			)}
			{view !== 'closed' && (
				<section
					role="dialog"
					aria-label={t('dialog_label')}
					aria-describedby="consent-body"
					onKeyDown={onKeyDown}
					className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-popover p-5 text-popover-foreground shadow-lg lg:inset-x-auto lg:bottom-6 lg:left-6 lg:w-[560px] lg:max-w-[calc(100%-3rem)] lg:rounded-3xl lg:p-6"
				>
					{view === 'first' ? (
						<>
							<h2 ref={heading} tabIndex={-1} className="font-display text-xl font-bold outline-hidden">
								{t('title')}
							</h2>
							<p id="consent-body" className="mt-2 text-muted-foreground">
								{reask && <>{reask} </>}
								{t('body_web')}{' '}
								<Link
									href="/cookies"
									prefetch={false}
									className="text-primary underline underline-offset-4"
								>
									{t('policy_link')}
								</Link>
							</p>
							<div className="mt-4 flex flex-col gap-3 lg:flex-row">
								<button type="button" className={button} onClick={() => choose(false)}>
									{t('reject_all')}
								</button>
								<button type="button" className={button} onClick={() => choose(true)}>
									{t('accept_all')}
								</button>
								<button
									type="button"
									className={button}
									onClick={() => {
										setAnalytics(false);
										setView('custom');
									}}
								>
									{t('customise')}
								</button>
							</div>
						</>
					) : (
						<>
							{!fromSettings && (
								<button type="button" className={textButton} onClick={() => setView('first')}>
									{t('back')}
								</button>
							)}
							<h2 ref={heading} tabIndex={-1} className="font-display text-xl font-bold outline-hidden">
								{t('settings_title')}
							</h2>
							<p id="consent-body" className="sr-only">
								{t('body_web')}
							</p>
							<label className="mt-4 flex min-h-14 items-start justify-between gap-4">
								<span>
									<span className="block font-bold">{t('necessary_title')}</span>
									<span className="block text-muted-foreground">{t('necessary_body')}</span>
								</span>
								<span className="flex shrink-0 flex-col items-end gap-1 text-sm text-muted-foreground">
									<input type="checkbox" role="switch" checked disabled readOnly className={sw} />
									{t('necessary_locked')}
								</span>
							</label>
							<label className="mt-4 flex min-h-14 items-start justify-between gap-4">
								<span>
									<span className="block font-bold">{t('analytics_title')}</span>
									<span className="block text-muted-foreground">{t('analytics_body_web')}</span>
								</span>
								<input
									type="checkbox"
									role="switch"
									aria-label={t('analytics_switch_a11y')}
									checked={analytics}
									onChange={(event) => setAnalytics(event.target.checked)}
									className={sw}
								/>
							</label>
							<p className="mt-4 text-sm text-muted-foreground">{t('ads_note')}</p>
							<div className="mt-4 flex flex-col gap-3 lg:flex-row">
								<button type="button" className={button} onClick={() => choose(analytics)}>
									{t('save')}
								</button>
								<button type="button" className={button} onClick={() => choose(true)}>
									{t('accept_all')}
								</button>
								<button type="button" className={button} onClick={() => choose(false)}>
									{t('reject_all')}
								</button>
							</div>
						</>
					)}
				</section>
			)}
		</>
	);
}
