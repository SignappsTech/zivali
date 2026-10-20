import type { Metadata } from 'next';
import type { Locale } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

import { ManageLazy } from '@/components/manage/manage-lazy';
import { PageMessages } from '@/components/page-messages';
import { PageSkeleton } from '@/components/shell/page';

export async function generateMetadata({ params }: PageProps<'/[locale]/m'>): Promise<Metadata> {
	const t = await getTranslations({ locale: (await params).locale as Locale, namespace: 'report_found' });
	return { title: t('manage_title'), robots: { index: false, follow: false } };
}

/** P7 manage page (`/m#<token>`, `/en/m#<token>`, C7, C15): private, noindex, no ad slot. The token never reaches the server. */
export default async function Page({ params }: PageProps<'/[locale]/m'>) {
	const { auth, chat, lifecycle, report, report_found } = await getMessages({
		locale: (await params).locale as Locale,
	});
	// The report's conversation rows (P12, TASK-21.3) need only these lines of the chat namespace.
	const { row_title_fallback, row_unread_a11y, row_status_closed } = chat;
	// The photo's fullscreen gallery (GH #7) and the under-review note's support link.
	const { photo_open, photos_title, photo_prev, photo_next, photo_position, photo_thumb, photo_failed } = report;
	const { owner_hidden_contact } = report;
	return (
		<PageMessages
			messages={{
				auth,
				lifecycle,
				report_found,
				chat: { row_title_fallback, row_unread_a11y, row_status_closed },
				report: {
					photo_open,
					photos_title,
					photo_prev,
					photo_next,
					photo_position,
					photo_thumb,
					photo_failed,
					owner_hidden_contact,
				},
			}}
		>
			<ManageLazy>
				{/* ManagePage's first render (its <main> before the claim, the skeleton), so the swap moves nothing (CLS). */}
				<main id="main" className="mx-auto box-content min-h-[456px] max-w-[560px] px-5 pt-6 pb-16 lg:pb-24">
					<PageSkeleton />
				</main>
			</ManageLazy>
		</PageMessages>
	);
}
