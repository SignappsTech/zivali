'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatDate, type Locale } from '@zivali/i18n/format';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

/**
 * "Nadaljujete prijavo?" while a draft from an earlier visit (saved `at`) is offered; closing it keeps the draft as it
 * is. Loaded by LostFlow only when there is such a draft.
 */
export function ResumeDialog({
	at,
	onContinue,
	onDiscard,
	onClose,
}: {
	at?: number;
	onContinue: () => void;
	onDiscard: () => void;
	onClose: () => void;
}) {
	const t = useTranslations('report_lost');
	const locale = useLocale() as Locale;
	return (
		<AlertDialog open={at !== undefined} onOpenChange={(open) => !open && onClose()}>
			{/* Focus goes to the restored step's heading, not back to where it was before the dialog. */}
			<AlertDialogContent onCloseAutoFocus={(event) => event.preventDefault()}>
				<AlertDialogTitle>{t('resume_title')}</AlertDialogTitle>
				<AlertDialogDescription>
					{t('resume_body', { date: at === undefined ? '' : formatDate(at, locale) })}
				</AlertDialogDescription>
				<AlertDialogFooter>
					<AlertDialogAction variant="default" onClick={onContinue}>
						{t('resume_continue')}
					</AlertDialogAction>
					<Button
						variant="text"
						onClick={() => {
							onDiscard();
							onClose();
						}}
					>
						{t('resume_discard')}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
