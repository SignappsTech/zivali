'use client';

import type { Icon } from '@phosphor-icons/react';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { ClockIcon } from '@phosphor-icons/react/dist/ssr/Clock';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/ssr/WarningCircle';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useLocale, useTranslations } from 'next-intl';
import { DropdownMenu } from 'radix-ui';
import * as React from 'react';

import type { AdminOpeningHours } from '@zivali/api/directory-admin';
import type { QueryError } from '@zivali/api/rtk';
import { formatDate } from '@zivali/i18n/format';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { type Day, type DiffField, type DiffRow, formatDays, formatHours, isStale } from './format';

// Note (system §10.6): muted, radius 20, icon 22, 15/22.
export const noteClass = 'flex gap-3 rounded-row bg-muted px-[18px] py-4 text-control leading-[22px]';
export const noteIconClass = 'mt-px size-[22px] shrink-0';

/** Inline error for a region or a failed save (system §10.9). */
export function ErrorNote({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
	return (
		<div className={noteClass} role="alert">
			<WarningCircleIcon weight="fill" aria-hidden="true" className={cn(noteIconClass, 'text-destructive')} />
			<div>
				<p>{children}</p>
				{action}
			</div>
		</div>
	);
}

/** Filter pill (system §10.4): secondary, selected primary with a check. */
export function Pill({
	pressed,
	onPressedChange,
	children,
}: {
	pressed: boolean;
	onPressedChange: (next: boolean) => void;
	children: React.ReactNode;
}) {
	return (
		<Button
			type="button"
			size="sm"
			variant={pressed ? 'default' : 'secondary'}
			aria-pressed={pressed}
			className="rounded-chip text-control"
			onClick={() => onPressedChange(!pressed)}
		>
			{pressed && <CheckIcon weight="bold" aria-hidden="true" className="size-4.5" />}
			{children}
		</Button>
	);
}

export const pillClass = cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'rounded-chip text-control');

/** Date (tabular) plus, when older than 12 months, the clock icon and the bold word: never colour alone. */
export function CheckedDate({ date, today }: { date: string; today: string }) {
	const t = useTranslations('admin.directory');
	const locale = useLocale();
	return (
		<span className="whitespace-nowrap">
			<span className="inline-block tabular-nums lg:min-w-[6.6em]">{formatDate(date, locale)}</span>
			{isStale(date, today) && (
				<span className="ml-1 inline-flex items-center gap-1 font-bold">
					<ClockIcon weight="fill" aria-hidden="true" className="size-4" />
					{t('stale')}
				</span>
			)}
		</span>
	);
}

/**
 * Right drawer (system §10.9): 480 px, full width below 640, card surface, modal with focus trapped; Escape and the
 * close button return focus to where it was. The body scrolls under the head and the footer.
 */
export function Drawer({
	open,
	onOpenChange,
	title,
	description,
	actions,
	footer,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: React.ReactNode;
	description?: React.ReactNode;
	actions?: React.ReactNode;
	footer?: React.ReactNode;
	children: React.ReactNode;
}) {
	const t = useTranslations('admin');
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				{...(description ? {} : { 'aria-describedby': undefined })}
				className="top-0 right-0 left-auto flex h-dvh max-h-none w-full max-w-none translate-0 flex-col overflow-hidden rounded-none bg-card p-0 text-card-foreground sm:max-w-[480px] sm:rounded-l-card"
			>
				<div className="flex items-start justify-between gap-3 pt-6 pr-4 pb-2 pl-6">
					<div className="min-w-0">
						<DialogTitle className="text-xl">{title}</DialogTitle>
						{description && (
							<DialogDescription className="mt-1 text-sm text-muted-foreground">
								{description}
							</DialogDescription>
						)}
					</div>
					<div className="-mr-1 flex shrink-0 items-center gap-1">
						{actions}
						<DialogClose asChild>
							<Button variant="ghost" size="icon" aria-label={t('drawer_close')}>
								<XIcon weight="bold" aria-hidden="true" />
							</Button>
						</DialogClose>
					</div>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2 pb-6">{children}</div>
				{footer && <div className="flex items-center gap-2 px-6 pt-4 pb-6">{footer}</div>}
			</DialogContent>
		</Dialog>
	);
}

export type MenuItem = { label: string; icon: Icon; onSelect: () => void; danger?: boolean };

/** Per-row actions (system §10.9 menu): 44 px trigger named "Dejanja: {row}", 48 px rows, the destructive one last. */
export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<Button variant="ghost" size="icon" aria-label={label}>
					<DotsThreeIcon weight="bold" aria-hidden="true" />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={4}
					aria-label={label}
					className="z-50 w-52 rounded-row bg-popover p-2 text-popover-foreground shadow-pop"
				>
					{items.map(({ label: item, icon: ItemIcon, onSelect, danger }) => (
						<React.Fragment key={item}>
							{danger && <DropdownMenu.Separator className="mx-3 my-1.5 h-px bg-border" />}
							<DropdownMenu.Item
								onSelect={onSelect}
								className={cn(
									'flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-3 font-semibold outline-hidden select-none data-[highlighted]:bg-foreground/10',
									danger && 'text-destructive'
								)}
							>
								<ItemIcon weight="bold" aria-hidden="true" className="size-5" />
								{item}
							</DropdownMenu.Item>
						</React.Fragment>
					))}
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	);
}

const FIELD_LABELS = {
	name: 'field_name',
	address: 'field_street',
	postal_code: 'field_postcode',
	city: 'field_place',
	phone_display: 'field_phone',
	website: 'field_website',
	email: 'field_email',
	opening_hours: 'hours_title',
	shelter_slug: 'col_shelter',
	status: 'col_status',
	source: 'field_source',
	verified_at: 'field_checked',
} as const satisfies Record<DiffField, string>;

/** Labels and value formats shared by the tables, the history and the import diff. */
export function useDirectoryLabels(shelterName: (slug: string) => string) {
	const t = useTranslations('admin.directory');
	const locale = useLocale();
	const day = (code: Day) => t(`day_${code}`);
	return {
		day,
		days: (days: string) => formatDays(days, day),
		hours: (row: AdminOpeningHours) => formatHours(row, locale, t('hours_closed')),
		fieldLabel: (row: Pick<DiffRow, 'field' | 'days'>) =>
			row.days ? t('history_field_hours', { days: formatDays(row.days, day) }) : t(FIELD_LABELS[row.field]),
		value: (field: DiffField, raw: string) =>
			field === 'verified_at'
				? formatDate(raw, locale)
				: field === 'status'
					? t(raw === 'CONFIRMED' ? 'status_confirmed' : 'status_unconfirmed')
					: field === 'shelter_slug'
						? shelterName(raw)
						: raw,
	};
}

/** C1 error code to its message (errors namespace); RATE_LIMITED without a wait time. */
export function useErrorText() {
	const t = useTranslations('errors');
	return (error: unknown) => {
		const code = (error as Partial<QueryError> | undefined)?.data?.code ?? 'INTERNAL';
		return code === 'RATE_LIMITED' ? t('RATE_LIMITED_generic') : t(code);
	};
}

export const isConflict = (error: unknown) => (error as Partial<QueryError> | undefined)?.data?.code === 'CONFLICT';
