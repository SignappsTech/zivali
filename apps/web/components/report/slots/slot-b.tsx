import { useLocale, useTranslations } from 'next-intl';

import type { Locale } from '@zivali/i18n/format';
import { ShareMenu } from '@/components/report/share-menu';
import type { ReportSlotProps } from '@/components/report/slots/types';
import { env } from '@/lib/env';
import {
	kitTexts,
	posterBand,
	posterFileName,
	posterPath,
	reportLink,
	shareMessage,
	squareFileName,
	squarePath,
} from '@/lib/share';

/**
 * P9 slot B: the ghost button "Deli ali natisni plakat" and its menu (P18): copy link, WhatsApp, Facebook, the Web
 * Share API and the poster with its QR code. The owner of an open lost report gets the Facebook kit from the Facebook
 * row. Texts carry only the short link and the area name (content P18 §4); the strings are made here, so the client
 * menu ships no intl runtime (TASK-90.7). A closed search is not shared further; a report the public cannot open
 * (held or hidden, the owner's view) has no link to share.
 */
export function SlotB({ report, place }: ReportSlotProps) {
	const locale = useLocale() as Locale;
	const t = useTranslations();
	if (report.status === 'closed' || (report.moderation_state ?? 'visible') !== 'visible') return null;

	const active = report.status === 'open' || report.status === 'matched';
	const code = report.short_code;
	const ctx = { report, area: place?.label, locale };
	const texts = report.is_mine && active ? kitTexts(ctx) : null;
	const title = [posterBand(report, locale), report.name].filter(Boolean).join(' ');

	return (
		<ShareMenu
			url={reportLink(code)}
			message={shareMessage(ctx)}
			analytics={{ report_type: report.type, species: report.species, region: report.region_slug }}
			poster={{
				href: { sl: posterPath(code, 'sl'), en: posterPath(code, 'en') },
				fileName: { sl: posterFileName(code, 'sl'), en: posterFileName(code, 'en') },
				readyFile: {
					sl: t('poster.ready_file', { filename: posterFileName(code, 'sl') }),
					en: t('poster.ready_file', { filename: posterFileName(code, 'en') }),
				},
				lang: locale,
				photo: report.photos.length > 0,
				reunited: report.status === 'reunited',
			}}
			kit={
				texts && {
					...texts,
					image: squarePath(code, locale),
					imageName: squareFileName(code, locale),
					configUrl: `${env.NEXT_PUBLIC_API_URL}/v1/config/public`,
				}
			}
			copy={{
				button: t('report.share_button'),
				copy: t('report.share_copy'),
				whatsapp: t('report.share_whatsapp'),
				facebook: t('report.share_facebook'),
				facebookCopied: t('share.facebook_copied'),
				facebookCopyFailed: t('share.facebook_copy_failed'),
				more: t('share.more'),
				poster: t('report.share_poster'),
				copied: t('share.copied'),
				unsupported: t('share.unsupported'),
				copyFailed: t('share.copy_failed'),
				close: t('common.close'),
				opensNewTab: t('common.opens_new_tab'),
				languageLabel: t('poster.language_label'),
				languageSl: t('poster.language_sl'),
				languageEn: t('poster.language_en'),
				download: t('poster.download'),
				preparing: t('poster.preparing'),
				print: t('poster.print'),
				qrNote: t('poster.qr_note'),
				noPhoto: t('poster.no_photo'),
				failed: t('poster.failed'),
				tryAgain: t('common.try_again'),
				reunited: t('browse.status_reunited'),
				kitTitle: t('share.kit_title'),
				kitIntro: t('share.kit_intro'),
				kitPostTitle: t('share.kit_post_title'),
				kitCopy: t('share.kit_copy'),
				kitCopied: t('share.kit_copied'),
				kitImageTitle: t('share.kit_image_title'),
				kitImageSave: t('share.kit_image_save'),
				kitImageAlt: t('share.kit_image_alt', { title }),
				kitGroupsTitle: t('share.kit_groups_title'),
				kitGroupsIntro: t('share.kit_groups_intro'),
				kitGroupsHint: t('share.kit_groups_hint'),
				kitMediaTitle: t('share.kit_media_title'),
				kitMediaIntro: t('share.kit_media_intro'),
				kitMediaHint: t('share.kit_media_hint'),
				kitMediaForm: t('share.kit_media_form'),
			}}
		/>
	);
}
