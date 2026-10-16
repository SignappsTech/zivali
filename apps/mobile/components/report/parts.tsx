import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArchiveIcon } from 'phosphor-react-native/src/icons/Archive';
import * as React from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import type { DetailReport } from '@/components/report/slots';
import { Icon } from '@/components/ui/icon';
import { type Status, statusIcons } from '@/components/ui/status-label';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** The status the page shows: the report type while open or matched, else reunited or closed (P9 status variants). */
export const statusOf = (report: Pick<DetailReport, 'type' | 'status'>): Status | 'closed' =>
	report.status === 'reunited' || report.status === 'closed' ? report.status : report.type;

const statusColor: Record<Status | 'closed', string> = {
	lost: 'text-status-lost-subtle-foreground',
	found: 'text-status-found-subtle-foreground',
	sighted: 'text-status-sighted-subtle-foreground',
	reunited: 'text-status-reunited-subtle-foreground',
	closed: 'text-muted-foreground',
};

/** P9 large status word (`st-lg`): fill icon 18 and the word 16 bold in the status colour; closed is muted. */
export function StatusWord({ report }: { report: Pick<DetailReport, 'type' | 'status'> }) {
	const t = useTranslations('browse');
	const status = statusOf(report);
	return (
		<View accessible className="flex-row items-center gap-[5px] self-start">
			<Icon
				as={status === 'closed' ? ArchiveIcon : statusIcons[status]}
				weight="fill"
				size={18}
				className={statusColor[status]}
			/>
			<Text className={cn('font-sans-bold', statusColor[status])}>{t(`status_${status}`)}</Text>
		</View>
	);
}

/** Calm note (system §10.9): muted surface, radius 20, icon 22, text 15/22. */
export function Note({
	icon,
	iconClassName = 'text-primary',
	role,
	children,
	action,
	className,
}: {
	icon: PhosphorIcon;
	iconClassName?: string;
	/** `status` for a state the screen reader announces politely, `alert` for an error; none for a fixed note. */
	role?: 'status' | 'alert';
	children: React.ReactNode;
	/** A text button after the sentence (retry, view). */
	action?: React.ReactNode;
	className?: string;
}) {
	return (
		<View
			// A state note is one element read with its role and announced on change; its action stays its own target.
			accessible={!!role && !action}
			role={role}
			aria-live={role === 'alert' ? 'assertive' : role && 'polite'}
			className={cn(
				'flex-row gap-3 rounded-row bg-muted px-[18px] py-4',
				action && 'items-center pr-2',
				className
			)}
		>
			<Icon as={icon} weight="fill" size={22} className={cn('mt-0.5', iconClassName)} />
			<Text className="min-w-0 flex-1 text-control leading-[22px]">{children}</Text>
			{action}
		</View>
	);
}
