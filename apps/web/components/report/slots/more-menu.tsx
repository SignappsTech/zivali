'use client';

import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { FlagIcon } from '@phosphor-icons/react/dist/ssr/Flag';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { DropdownMenu } from 'radix-ui';
import * as React from 'react';

import type { AbuseTarget } from '@/components/abuse/report-abuse';
import { Button } from '@/components/ui/button';

// The dialog (store, API client, captcha) loads with the first "Prijavi zlorabo": the detail page ships none of it.
const ReportAbuseDialog = dynamic(() => import('@/components/abuse/report-abuse').then((m) => m.ReportAbuseDialog), {
	ssr: false,
});

// System §10.9 menu rows: 48 px, icon 20, 16 semibold (as the admin menus).
const rowClass =
	'flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-3 font-semibold outline-hidden select-none data-[highlighted]:bg-foreground/10 [&_svg]:size-5';

/**
 * Slot C's "Več možnosti" (P9 S2): a 44 px ghost icon button and its menu, right edge on the button. A row opens its
 * dialog (`onChoose`) once the menu has closed and handed focus back to the button, so the dialog returns it there.
 */
export function OverflowMenu({
	icon: Icon,
	label,
	onChoose,
}: {
	icon: PhosphorIcon;
	label: string;
	onChoose: () => void;
}) {
	const t = useTranslations('report');
	const chosen = React.useRef(false);
	return (
		// Not modal (the APG menu button): a modal menu aria-hides the page while its links stay focusable.
		<DropdownMenu.Root modal={false}>
			<DropdownMenu.Trigger asChild>
				<Button variant="ghost" size="icon" aria-label={t('more')}>
					<DotsThreeIcon weight="bold" aria-hidden="true" />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={4}
					aria-label={t('more')}
					className="z-50 w-62 rounded-row bg-popover p-2 text-popover-foreground shadow-pop"
					// Runs before the menu focuses its trigger: the dialog then opens over a focused "Več možnosti".
					onCloseAutoFocus={() => {
						if (!chosen.current) return;
						chosen.current = false;
						onChoose();
					}}
				>
					<DropdownMenu.Item className={rowClass} onSelect={() => (chosen.current = true)}>
						<Icon weight="bold" aria-hidden="true" />
						{label}
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

/** The visitors' menu: "Prijavi zlorabo" opens the P10 dialog. */
export function MoreMenu({ target }: { target: AbuseTarget }) {
	const t = useTranslations('report');
	const [abuse, setAbuse] = React.useState(false);
	// Mounted from the first open on, so it can return focus as it closes.
	const [loaded, setLoaded] = React.useState(false);
	return (
		<>
			<OverflowMenu
				icon={FlagIcon}
				label={t('more_abuse')}
				onChoose={() => {
					setLoaded(true);
					setAbuse(true);
				}}
			/>
			{loaded && <ReportAbuseDialog target={target} open={abuse} onOpenChange={setAbuse} />}
		</>
	);
}
