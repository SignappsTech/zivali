import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { useLocale, useTranslations } from 'use-intl';

import { useReversePlaceQuery } from '@zivali/api/geocode';
import type { ReportSlotProps } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { shareMessage, shareNative } from '@/lib/share';

/**
 * P9 slot B, share: the share button over the photo and in the compact top bar ("Deli"). It opens the system share
 * sheet with the localised P18 text and the short link (`share` counted with consent only). The area name is the
 * detail page's own reverse lookup (the same cached query); offline the text is the link alone. The poster and the
 * owner's Facebook kit live on the P18 screen (`r/[code]/poster`, slot A "Plakat"). A closed search is not spread
 * further, so a closed report has no share.
 */
export function SlotB({ report, offline, className, style }: ReportSlotProps) {
	const t = useTranslations('report');
	const locale = useLocale();
	const active = report.status === 'open' || report.status === 'matched';
	const { data: place } = useReversePlaceQuery(
		{ lat: report.area.lat, lng: report.area.lng },
		{ skip: offline || !active }
	);
	if (report.status === 'closed') return null;
	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label={t('mobile_share')}
			className={className}
			style={style}
			onPress={() => void shareNative(report, shareMessage({ report, area: place?.label, locale }))}
		>
			<Icon as={ShareNetworkIcon} size={22} />
		</Button>
	);
}
