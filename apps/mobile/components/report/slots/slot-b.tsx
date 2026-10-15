import { ShareNetworkIcon } from 'phosphor-react-native/src/icons/ShareNetwork';
import { Share } from 'react-native';
import { useTranslations } from 'use-intl';

import type { ReportSlotProps } from '@/components/report/slots';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { env } from '@/lib/env';

/** The short canonical link of a report (C15): posters and shares use `https://<APP_HOST>/r/<code>`. */
export const reportLink = (code: string) => `${env.EXPO_PUBLIC_APP_URL}/r/${code}`;

/**
 * P9 slot B, share and poster. On mobile it is the share button over the photo and in the compact top bar ("Deli");
 * it opens the system share sheet with the short link. The P18 sheet (localised text, WhatsApp, Facebook, poster)
 * replaces the plain share with TASK-24.3. A closed search is not spread further, so a closed report has none.
 */
export function SlotB({ report, className, style }: ReportSlotProps) {
	const t = useTranslations('report');
	if (report.status === 'closed') return null;
	return (
		<Button
			variant="ghost"
			size="icon"
			aria-label={t('mobile_share')}
			className={className}
			style={style}
			onPress={() => void Share.share({ message: reportLink(report.short_code) }).catch(() => undefined)}
		>
			<Icon as={ShareNetworkIcon} size={22} />
		</Button>
	);
}
