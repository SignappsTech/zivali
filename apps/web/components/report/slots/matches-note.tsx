import { EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import { NextIntlClientProvider, useLocale, useMessages, useTranslations } from 'next-intl';

import { SUPPORT_EMAIL } from '@/components/content/article';
import { MatchesLink } from '@/components/report/slots/owner-lazy';
import type { ReportSlotProps } from '@/components/report/slots/types';
import { noteClass } from '@/components/shelters/classes';
import { ringClass } from '@/components/shell/page';
import { cn } from '@/lib/utils';

/** The suggestions note, a client island with only its own two strings (the page scopes its client copy). */
function MatchesCount({ code, className }: { code: string; className?: string }) {
	const { owner_matches, owner_matches_link } = useMessages().report;
	return (
		<NextIntlClientProvider locale={useLocale()} messages={{ report: { owner_matches, owner_matches_link } }}>
			<MatchesLink code={code} className={className} />
		</NextIntlClientProvider>
	);
}

/**
 * P9 matches-note slot: the owner's one note at the top of the info column (P9 S7), one variant at a time. Held and
 * hidden reports say why others cannot see them; an open lost report with suggestions says "N možnih ujemanj" with
 * "Poglej" to the P11 list (TASK-20.3). Public: nothing.
 */
export function MatchesNote({ report, className }: ReportSlotProps) {
	const t = useTranslations('report');
	if (!report.is_mine) return null;
	const [Icon, text] =
		report.moderation_state === 'held'
			? [HourglassMediumIcon, t('owner_held')]
			: report.moderation_state === 'hidden'
				? [EyeSlashIcon, t('owner_hidden')]
				: [];
	if (!Icon)
		return report.type === 'lost' && (report.status === 'open' || report.status === 'matched') ? (
			<MatchesCount code={report.short_code} className={className} />
		) : null;
	return (
		<div role="status" className={cn(noteClass, className)}>
			<Icon weight="fill" aria-hidden="true" className="mt-px size-[22px] shrink-0 text-primary" />
			<p>
				{text}
				{report.moderation_state === 'hidden' && (
					<>
						{' '}
						<a
							href={`mailto:${SUPPORT_EMAIL}`}
							className={cn(
								ringClass,
								'rounded-sm font-medium text-primary underline underline-offset-2'
							)}
						>
							{t('owner_hidden_contact')}
						</a>
					</>
				)}
			</p>
		</div>
	);
}
