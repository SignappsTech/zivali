import { Stack } from 'expo-router';
import { ScrollView } from 'react-native';
import { useTranslations } from 'use-intl';

import { setConsent } from '@zivali/analytics';
import { ConsentCustomise, useConsent } from '@/components/shell/consent';
import { toast } from '@/components/ui/sonner';

/** Settings -> Cookie settings (P17): the stored choice, changed or withdrawn with one switch and Save, then a toast. */
export default function ConsentSettings() {
	const t = useTranslations('consent');
	const { state, due } = useConsent();
	return (
		<ScrollView className="flex-1 bg-background" contentContainerClassName="px-5 pb-8 pt-6">
			<Stack.Screen options={{ title: t('settings_title') }} />
			<ConsentCustomise
				// Remount when the stored value changes so the switch always shows the stored choice.
				key={`${state?.ts}`}
				initial={!due && state?.analytics === true}
				onChoose={(analytics) => {
					setConsent({ analytics });
					toast.success(t('saved_toast'));
				}}
			/>
		</ScrollView>
	);
}
