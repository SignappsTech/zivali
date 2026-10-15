import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { BellSlashIcon } from 'phosphor-react-native/src/icons/BellSlash';
import { CameraIcon } from 'phosphor-react-native/src/icons/Camera';
import { CameraSlashIcon } from 'phosphor-react-native/src/icons/CameraSlash';
import { GpsSlashIcon } from 'phosphor-react-native/src/icons/GpsSlash';
import { MapPinIcon } from 'phosphor-react-native/src/icons/MapPin';
import * as React from 'react';
import { Linking, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslations } from 'use-intl';

import { Spot } from '@/components/shell/parts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type PermissionKind = 'camera' | 'location' | 'notifications';

const ICONS: Record<PermissionKind, [spot: PhosphorIcon, denied: PhosphorIcon]> = {
	camera: [CameraIcon, CameraSlashIcon],
	location: [MapPinIcon, GpsSlashIcon],
	notifications: [BellIcon, BellSlashIcon],
};

// SheetContent around the body: the grabber (44 px, -12 overlap) and the bottom padding (32 px or the safe area).
const SHEET_CHROME = 32;

/**
 * P2 permission primer: a full-height sheet (92 %) shown before the OS prompt, never on first launch. Spot icon, h2,
 * two plain-language sentences, `lg` "Allow" (runs `request`, the OS prompt) and "Ne zdaj". At 200 % text the body
 * scrolls and the buttons stay pinned. Show it only while the OS can still ask (status undetermined); otherwise go
 * straight to the feature or to `PermissionNote`.
 */
export function PermissionPrimer({
	kind,
	open,
	request,
	onResult,
}: {
	kind: PermissionKind;
	open: boolean;
	/** The OS prompt, e.g. `async () => (await Location.requestForegroundPermissionsAsync()).granted`. */
	request: () => Promise<boolean>;
	/** Close the primer here. `false` also for "Ne zdaj", the grabber, the scrim and Android back: show the fallback. */
	onResult: (granted: boolean) => void;
}) {
	const t = useTranslations('permissions');
	const tc = useTranslations('common');
	const { height } = useWindowDimensions();
	const insets = useSafeAreaInsets();
	const [asking, setAsking] = React.useState(false);

	const allow = async () => {
		setAsking(true);
		const granted = await request().catch(() => false);
		setAsking(false);
		onResult(granted);
	};

	return (
		<Sheet open={open} onOpenChange={(next) => !next && onResult(false)}>
			<SheetContent closeLabel={tc('close')}>
				<View style={{ height: height * 0.92 - SHEET_CHROME - Math.max(32, insets.bottom) }}>
					<BottomSheetScrollView
						contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 24 }}
					>
						<Spot icon={ICONS[kind][0]} />
						<Text role="heading" className="mt-8 font-display text-2xl tracking-[-0.36px]">
							{t(`${kind}_title`)}
						</Text>
						<Text className="mt-3 text-lg">{t(`${kind}_body`)}</Text>
					</BottomSheetScrollView>
					<View className="gap-1 pb-3 pt-2">
						<Button size="lg" loading={asking} onPress={allow}>
							{t(`${kind}_allow`)}
						</Button>
						<Button variant="text" disabled={asking} onPress={() => onResult(false)}>
							{t('not_now')}
						</Button>
					</View>
				</View>
			</SheetContent>
		</Sheet>
	);
}

/**
 * The denied fallback, in the place that needed the permission: one quiet sentence naming the alternative that works
 * without it, and "Odpri nastavitve telefona". Notifications use the `note` surface (inbox, P2 B7).
 */
export function PermissionNote({ kind, className }: { kind: PermissionKind; className?: string }) {
	const t = useTranslations('permissions');
	const boxed = kind === 'notifications';
	return (
		<View className={cn('flex-row gap-3', boxed ? 'rounded-row bg-muted px-[18px] py-4' : 'gap-2', className)}>
			<Icon
				as={ICONS[kind][1]}
				size={boxed ? 22 : 16}
				className={cn('mt-0.5', boxed ? 'text-foreground' : 'text-muted-foreground')}
			/>
			<View className="min-w-0 flex-1 items-start">
				<Text className={boxed ? 'text-control leading-[22px]' : 'text-sm text-muted-foreground'}>
					{t(`${kind}_denied`)}
				</Text>
				<Button variant="text" className="-ml-3" onPress={() => Linking.openSettings()}>
					{t('open_settings')}
				</Button>
			</View>
		</View>
	);
}
