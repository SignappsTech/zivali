'use client';

import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { SparkleIcon } from '@phosphor-icons/react/dist/ssr/Sparkle';
import { useTranslations } from 'next-intl';

import { useListMatchesQuery } from '@zivali/api/matches';
import { LIST_STATES, Note } from '@/components/matches/parts';
import { StoreProvider } from '@/components/store-provider';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

function Count({ code, className }: { code: string; className?: string }) {
	const t = useTranslations('report');
	// The same query as the P11 list, so opening it shows the rows at once.
	const { data } = useListMatchesQuery({ code, state: LIST_STATES });
	const count = data?.items.filter((m) => m.state === 'suggested').length ?? 0;
	if (count === 0) return null;
	return (
		<Note
			role="status"
			icon={SparkleIcon}
			className={className}
			action={
				<Button asChild variant="text" size="sm">
					<Link href={{ pathname: '/r/[code]/matches', params: { code } }}>
						{t('owner_matches_link')}
						<ArrowRightIcon weight="bold" aria-hidden="true" />
					</Link>
				</Button>
			}
		>
			<span className="font-semibold tabular-nums">{t('owner_matches', { count })}</span>
		</Note>
	);
}

/**
 * P9 owner note "N možnih ujemanj" with "Poglej" to the P11 list, while an open lost report has suggestions; nothing
 * otherwise. Public pages have no store (TASK-90.5), so this island brings its own.
 */
export function MatchesLink(props: { code: string; className?: string }) {
	return (
		<StoreProvider>
			<Count {...props} />
		</StoreProvider>
	);
}
