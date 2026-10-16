import { type Href, useRouter } from 'expo-router';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { ArrowCounterClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowCounterClockwise';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { PencilSimpleIcon } from 'phosphor-react-native/src/icons/PencilSimple';
import * as React from 'react';
import { View } from 'react-native';
import { useTranslations } from 'use-intl';

import { AuthGate } from '@/components/auth/gate';
import { HomeAgain, useReopen } from '@/components/report/lifecycle';
import type { DetailReport, ReportSlotProps } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

type Action = { label: string; icon: PhosphorIcon; onPress?: () => void };

/**
 * P9 action slot A, in the sticky action bar: a primary `lg` action with `children` (the slot C overflow) beside it
 * and the text button(s) under it.
 * - Lost: "Sporoči opažanje", text "Pošlji sporočilo". Found: "To je moja žival", text "Sporoči opažanje".
 *   Sighted: "Pošlji sporočilo", text "To je moja žival".
 * - Owner (signed-in owner or manage-link holder, `is_mine`): "Žival je spet doma" (the P14 confirm, then
 *   `r/[code]/reunited`), text "Uredi" (`r/[code]/edit`); "Plakat" joins with TASK-24.3. Closed or reunited within the
 *   reopen window: "Ponovno odpri" only ("Nadaljuj iskanje" after the 90-day expiry).
 * A sighting opens the sighted flow linked to this report (C15 `report/found?type=sighted`, TASK-30.3). Contact
 * needs an account: the P16 gate first, then TASK-21.4 opens the conversation in `startContact`.
 */
export function SlotA({ report, offline, children }: ReportSlotProps) {
	const t = useTranslations('report');
	const router = useRouter();
	const [gate, setGate] = React.useState(false);
	const [home, setHome] = React.useState(false);
	// TASK-21.4 fills this: it opens the conversation once the P16 gate is passed.
	const startContact = React.useCallback(() => undefined, []);

	// The layout shows the bar for an ended report only while the owner can still reopen it.
	if (report.status === 'closed' || report.status === 'reunited') return <Reopen report={report} offline={offline} />;

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

	// Every action needs the network (the sighting flow does not queue through the outbox yet), so the saved copy
	// disables them all and says why.
	const [primary, ...secondary]: Action[] = report.is_mine
		? [
				{ label: t('owner_home'), icon: HeartIcon, onPress: () => setHome(true) },
				{
					label: t('owner_edit'),
					icon: PencilSimpleIcon,
					onPress: () => router.push(`/r/${report.short_code}/edit` as Href),
				},
				// "Plakat" stays hidden until TASK-24.3 wires it.
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
			{report.is_mine ? (
				<HomeAgain report={report} open={home} onOpenChange={setHome} />
			) : (
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

/** P14 S6/S7: the one primary "Ponovno odpri" ("Nadaljuj iskanje" after the expiry); quiet text on a reunited report. */
function Reopen({ report, offline }: { report: DetailReport; offline: boolean }) {
	const tl = useTranslations('lifecycle');
	const { reopen, busy } = useReopen(report);
	const expired = report.type === 'lost' && report.close_reason === 'expired';
	return (
		<Button
			size="lg"
			variant={report.status === 'reunited' ? 'text' : 'default'}
			loading={busy}
			disabled={offline}
			onPress={() => void reopen()}
		>
			<Icon as={ArrowCounterClockwiseIcon} />
			{expired ? tl('expired_lost_action') : tl('reopen')}
		</Button>
	);
}
