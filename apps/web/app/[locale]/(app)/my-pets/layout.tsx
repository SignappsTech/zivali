import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { Toaster } from '@/components/ui/sonner';
import { requireViewer } from '@/lib/viewer';

/** P8 pet pages need an account (C15 myPets: signed in, anonymous report managers excluded). One Toaster for all of them, so "Profil je shranjen." survives the move to the next page. */
export default async function MyPetsLayout({ children, params }: LayoutProps<'/[locale]/my-pets'>) {
	const locale = (await params).locale as Locale;
	await requireViewer(locale);
	const t = await getTranslations({ locale, namespace: 'common' });

	return (
		<>
			{children}
			<Toaster closeLabel={t('close')} label={t('toasts_label')} />
		</>
	);
}
