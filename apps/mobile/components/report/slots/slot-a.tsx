import { type Href, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import { PrinterIcon } from 'phosphor-react-native/src/icons/Printer';
import * as React from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { AuthGate } from '@/components/auth/gate';
import type { ReportSlotProps } from '@/components/report/slots';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

type Action = { label: string; icon: PhosphorIcon; onPress?: () => void };

/**
 * P9 action slot A, in the sticky action bar: a primary `lg` action with `children` (the slot C overflow) beside it
 * and the text button(s) under it.
 * - Lost: "Sporoči opažanje", text "Pošlji sporočilo". Found: "To je moja žival", text "Sporoči opažanje".
 *   Sighted: "Pošlji sporočilo", text "To je moja žival".
 * - Owner (signed-in owner or manage-link holder): "Žival je spet doma" (P14), text "Uredi" and "Plakat".
 * A sighting opens the sighted flow linked to this report (C15 `report/found?type=sighted`, TASK-30.3). Contact
 * needs an account: the P16 gate first, then TASK-21.4 opens the conversation in `startContact`. "Žival je spet doma"
 * opens `r/[code]/reunited`; "Uredi" and "Plakat" are wired by TASK-26.5 and TASK-24.3.
 */
export function SlotA({ report, children }: ReportSlotProps) {
	const t = useTranslations('report');
	const router = useRouter();
	const [gate, setGate] = React.useState(false);
	const startContact = React.useCallback(() => undefined, []);

	const sighting: Action = {
		label: t('action_sighting'),
		icon: EyeIcon,
		onPress: () =>
			router.push({
				pathname: '/report/found',
				params: { type: 'sighted', linked_report_id: report.id },
			} as unknown as Href),
	};
	const contact = { onPress: () => setGate(true) };
	const message: Action = { label: t('action_message'), icon: ChatCircleIcon, ...contact };
	const mine: Action = { label: t('action_mine'), icon: HeartIcon, ...contact };

	const [primary, ...secondary]: Action[] = report.is_mine
		? [
				{
					label: t('owner_home'),
					icon: HeartIcon,
					onPress: () => router.push(`/r/${report.short_code}/reunited` as Href),
				},
				{ label: t('owner_edit'), icon: PencilSimpleIcon },
				{ label: t('owner_poster'), icon: PrinterIcon },
			]
		: { lost: [sighting, message], found: [mine, sighting], sighted: [message, mine] }[report.type];

	return (
		<View>
			<View className="flex-row items-center gap-2">
				<Button size="lg" className="flex-1 px-5" onPress={primary.onPress}>
					<Icon as={primary.icon} />
					{primary.label}
				</Button>
				{children}
			</View>
			<View className="mt-1 flex-row">
				{secondary.map((action) => (
					<Button key={action.label} variant="text" className="flex-1" onPress={action.onPress}>
						<Icon as={action.icon} />
						{action.label}
					</Button>
				))}
			</View>
			{!report.is_mine && (
				<AuthGate
					reason="contact"
					body={t('gate_body')}
					open={gate}
					onOpenChange={setGate}
					onReady={startContact}
				/>
			)}
		</View>
	);
}
