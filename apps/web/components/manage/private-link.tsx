'use client';

import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { CopyIcon } from '@phosphor-icons/react/dist/ssr/Copy';
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { manageLink } from '@/lib/manage-link';

/**
 * P7 success screen link block (C7): the private link as real, selectable text on a read-only line, "Kopiraj
 * povezavo" and "Povezava je kopirana." in a polite status for 5 s. Client only: it renders after the submit, with the
 * `manage_token` the caller has kept with saveManageToken. `emailed` when a finder email was given.
 */
export function PrivateLinkBlock({ token, emailed = false }: { token: string; emailed?: boolean }) {
	const t = useTranslations('report_found');
	const locale = useLocale();
	const link = manageLink(token, locale);
	const linkRef = React.useRef<HTMLParagraphElement>(null);
	const [copied, setCopied] = React.useState(false);
	const titleId = React.useId();

	React.useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 5000);
		return () => clearTimeout(timer);
	}, [copied]);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(link);
			setCopied(true);
		} catch {
			// No clipboard permission: select the link, so the browser's own copy takes it.
			const selection = window.getSelection();
			if (linkRef.current && selection) selection.selectAllChildren(linkRef.current);
		}
	};

	return (
		<Card role="region" aria-labelledby={titleId}>
			<h2 id={titleId} className="font-display text-lg leading-7 font-semibold lg:text-xl">
				{t('link_label')}
			</h2>
			<p
				ref={linkRef}
				className="mt-2 border-b-2 border-input px-0.5 py-2 tabular-nums [overflow-wrap:anywhere] select-all"
			>
				{link}
			</p>
			<p className="mt-2 text-sm text-muted-foreground">{t('link_help')}</p>
			<Button variant="secondary" className="mt-4 w-full sm:w-auto" onClick={copy}>
				<CopyIcon weight="bold" aria-hidden="true" />
				{t('link_copy')}
			</Button>
			<div role="status">
				{copied && (
					<p className="mt-3 flex items-center gap-1.5 text-sm font-bold">
						<CheckCircleIcon weight="fill" aria-hidden="true" className="size-4 text-primary" />
						{t('link_copied')}
					</p>
				)}
			</div>
			{emailed && (
				<p className="mt-4 flex gap-2 text-sm text-muted-foreground">
					<EnvelopeSimpleIcon
						weight="bold"
						aria-hidden="true"
						className="mt-0.5 size-4 shrink-0 text-primary"
					/>
					{t('link_emailed')}
				</p>
			)}
		</Card>
	);
}
