import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Uuid } from '@zivali/validation/common.schema';
import { Thread } from '@/components/chat/thread';
import { InboxViews } from '@/components/notifications/inbox-views';

export async function generateMetadata({ params }: PageProps<'/[locale]/inbox/[id]'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'chat' });
	return { title: t('inbox_title'), robots: { index: false } };
}

/**
 * Conversation (C15 `conversation`: `/nabiralnik/[id]`, `/en/inbox/[id]`; P12): from lg the list (360 px) beside the
 * thread (W1), below lg the thread alone. The thread fills the viewport under the header (88 px, 64 below md), so the
 * composer stays at the bottom. Participants only (the API answers FORBIDDEN otherwise). Protected flow: no ads (C15).
 */
export default async function ConversationPage({ params }: PageProps<'/[locale]/inbox/[id]'>) {
	const { id, locale } = await params;
	if (!Uuid.safeParse(id).success) notFound();
	const t = await getTranslations({ locale: locale as Locale, namespace: 'chat' });
	return (
		<div className="mx-auto box-content max-w-[1120px] px-5 md:px-12 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-6">
			{/* The padding keeps the rows' focus rings inside the scrolling pane. */}
			<nav
				aria-label={t('inbox_title')}
				className="-mx-3 hidden overflow-y-auto px-3 pt-2 pb-6 lg:block lg:h-[calc(100dvh-88px)]"
			>
				<InboxViews view="conversations" selected={id} />
			</nav>
			<main id="main" className="flex h-[calc(100dvh-64px)] min-h-[440px] flex-col md:h-[calc(100dvh-88px)]">
				<Thread id={id} />
			</main>
		</div>
	);
}
