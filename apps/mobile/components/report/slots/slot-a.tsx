import { type Href, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { PrinterIcon } from 'phosphor-react-native/src/icons/Printer';
import * as React from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { AuthGate } from '@/components/auth/gate';
import type { ReportSlotProps } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

type Action = { label: string; icon: PhosphorIcon; onPress?: () => void };

/**
 * P9 action slot A, in the sticky action bar: a primary `lg` action with `children` (the slot C overflow) beside it
 * and the text button(s) under it.
 * - Lost: "Sporoči opažanje", text "Pošlji sporočilo". Found: "To je moja žival", text "Sporoči opažanje".
 *   Sighted: "Pošlji sporočilo", text "To je moja žival".
 * - Owner (signed-in owner or manage-link holder): "Žival je spet doma" (P14), text "Uredi" and "Plakat".
 * A sighting opens the sighted flow linked to this report (C15 `report/found?type=sighted`, TASK-30.3). Contact
 * needs an account: the P16 gate first, then TASK-21.4 opens the conversation in `startContact`. "Žival je spet doma"
 * opens `r/[code]/reunited`; "Plakat" the P18 poster and sharing screen (`r/[code]/poster`); "Uredi" waits for
 * TASK-26.5.
 */
export function SlotA({ report, offline, children }: ReportSlotProps) {
	const t = useTranslations('report');
	const router = useRouter();
	const [gate, setGate] = React.useState(false);
	// TASK-21.4 fills this: it opens the conversation once the P16 gate is passed.
	const startContact = React.useCallback(() => undefined, []);

	const sighting: Action = {
		label: t('action_sighting'),
		icon: EyeIcon,
		onPress: () =>
			router.push({
				pathname: '/report/found',
				// The code shows the pet on every step; the species is the sighting's (the short flow does not ask it).
				params: {
					type: 'sighted',
					linked_report_id: report.id,
					code: report.short_code,
					species: report.species,
				},
			} as unknown as Href),
	};
	const contact = { onPress: () => setGate(true) };
	const message: Action = { label: t('action_message'), icon: ChatCircleIcon, ...contact };
	const mine: Action = { label: t('action_mine'), icon: HeartIcon, ...contact };

	// Every action needs the network (the sighting flow does not queue through the outbox yet), so the saved copy
	// disables them all and says why.
	const [primary, ...secondary]: Action[] = report.is_mine
		? [
				{
					label: t('owner_home'),
					icon: HeartIcon,
					// TODO(TASK-26.5): reunited screen
					onPress: () => router.push(`/r/${report.short_code}/reunited` as Href),
				},
				// Hidden until wired: "Uredi" by TASK-26.5.
				{
					label: t('owner_poster'),
					icon: PrinterIcon,
					onPress: () => router.push(`/r/${report.short_code}/poster` as Href),
				},
			]
		: { lost: [sighting, message], found: [mine, sighting], sighted: [message, mine] }[report.type];

	return (
		<View>
			<View className="flex-row items-center gap-2">
				<Button size="lg" className="flex-1 px-5" disabled={offline} onPress={primary.onPress}>
					<Icon as={primary.icon} />
					{primary.label}
				</Button>
				{children}
			</View>
			<View className="mt-1 flex-row">
				{secondary.map((action) => (
					<Button
						key={action.label}
						variant="text"
						className="flex-1"
						disabled={offline}
						onPress={action.onPress}
					>
						<Icon as={action.icon} />
						{action.label}
					</Button>
				))}
			</View>
			{offline && (
				<Text role="status" className="mt-2 text-center text-sm text-muted-foreground">
					{t('action_offline')}
				</Text>
			)}
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
