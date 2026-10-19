'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';
import { toast } from 'sonner';

import { Toaster } from '@/components/ui/sonner';

/**
 * The sign-in notice from the Google round trip (app/[locale]/auth/callback): a quiet toast, the form stays as it was
 * (P16 E4). Apart from sign-in.tsx, which loads it only with such a notice, so the auth pages ship no sonner up front
 * (TASK-9.9).
 */
export function NoticeToast({ notice }: { notice: 'cancelled' | 'failed' }) {
	const t = useTranslations();
	React.useEffect(() => {
		if (notice === 'cancelled') toast(t('auth.provider_cancelled'));
		else toast.error(t('errors.INTERNAL'));
	}, [notice, t]);
	return <Toaster closeLabel={t('common.close')} label={t('common.toasts_label')} />;
}
