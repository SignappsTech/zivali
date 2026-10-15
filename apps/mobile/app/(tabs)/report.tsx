import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { ReportChoices } from '@/components/shell/tab-bar';
import { Text } from '@/components/ui/text';

// The Prijavi tab button opens the Report sheet instead; this screen is the same choice for a link to /report.
export default function ReportTab() {
	const t = useTranslations('nav');
	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-background px-5 pt-6">
			<Text role="heading" className="font-display text-3xl tracking-[-0.6px]">
				{t('report_menu_title')}
			</Text>
			<ReportChoices />
		</SafeAreaView>
	);
}
