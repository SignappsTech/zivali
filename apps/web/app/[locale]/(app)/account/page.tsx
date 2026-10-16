import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { AccountSettings } from '@/components/account/account-settings';
import { SupportCard } from '@/components/payments/support';
import { ContentPage, h1Class } from '@/components/shell/page';
import { env, paymentsEnabled } from '@/lib/env';
import { requireViewer } from '@/lib/viewer';

export async function generateMetadata({ params }: PageProps<'/[locale]/account'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'nav' });
	return { title: t('account_profile'), robots: { index: false } };
}

/**
 * Account (`/racun`, `/en/account`, C15): a real account only, so no anonymous report manager (C7). Last, the quiet
 * P15 support card (C13 `support`), never a prompt; none while payments are off (paymentsEnabled).
 */
export default async function AccountPage({ params }: PageProps<'/[locale]/account'>) {
	const { locale } = await params;
	await requireViewer(locale);
	const t = await getTranslations({ locale: locale as Locale, namespace: 'nav' });

	return (
		<ContentPage>
			<h1 className={h1Class}>{t('account_profile')}</h1>
			<AccountSettings />
			{paymentsEnabled() && (
				<SupportCard testMode={env.APP_ENV !== 'production'} className="mt-16 max-w-[560px]" />
			)}
		</ContentPage>
	);
}
