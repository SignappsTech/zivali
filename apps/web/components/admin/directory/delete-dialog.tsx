'use client';

import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { type AdminShelter, useDeleteShelterMutation } from '@zivali/api/directory-admin';
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { ErrorNote, noteClass, noteIconClass, useErrorText } from './parts';

/** P19 §9: refused while municipalities are assigned; otherwise the shelter is named and the audit note is required. */
export function DeleteDialog({
	shelter,
	assigned,
	onClose,
}: {
	shelter: AdminShelter;
	assigned: number;
	onClose: () => void;
}) {
	const t = useTranslations('admin');
	const tCommon = useTranslations('common');
	const errorText = useErrorText();
	const [remove, removing] = useDeleteShelterMutation();
	const [note, setNote] = React.useState('');
	const [failure, setFailure] = React.useState<string>();

	async function confirm() {
		setFailure(undefined);
		try {
			await remove({ slug: shelter.slug, audit_note: note.trim() }).unwrap();
			toast.success(tCommon('toast_deleted'));
			onClose();
		} catch (error) {
			setFailure(errorText(error));
		}
	}

	return (
		<AlertDialog open onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent>
				<AlertDialogTitle>
					{t('destructive_title', { action: t('directory.action_delete'), target: shelter.name })}
				</AlertDialogTitle>
				{assigned > 0 ? (
					<div className={cn(noteClass, 'mt-4')}>
						<InfoIcon weight="fill" aria-hidden="true" className={noteIconClass} />
						<AlertDialogDescription className="mt-0">
							{t.rich('directory.delete_refused', {
								count: assigned,
								b: (chunks) => <b className="tabular-nums">{chunks}</b>,
							})}
						</AlertDialogDescription>
					</div>
				) : (
					<>
						<AlertDialogDescription>{t('directory.delete_body')}</AlertDialogDescription>
						<FormField
							label={t('audit_note_required_label')}
							hint={t('audit_note_required_help')}
							className="mt-5"
						>
							<Textarea
								rows={2}
								required
								value={note}
								onChange={(event) => setNote(event.target.value)}
							/>
						</FormField>
					</>
				)}
				{failure && (
					<div className="mt-4">
						<ErrorNote>{failure}</ErrorNote>
					</div>
				)}
				<AlertDialogFooter>
					<Button
						variant="destructive"
						disabled={assigned > 0 || !note.trim()}
						loading={removing.isLoading}
						onClick={confirm}
					>
						{t('directory.action_delete')}
					</Button>
					<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
