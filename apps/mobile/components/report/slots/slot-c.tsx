import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { DotsThreeIcon } from 'phosphor-react-native/src/icons/DotsThree';
import { FlagIcon } from 'phosphor-react-native/src/icons/Flag';
import { XCircleIcon } from 'phosphor-react-native/src/icons/XCircle';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTranslations } from 'use-intl';

import type { ReportSlotProps } from '@/components/report/slots';
import { Button } from '@/components/ui/button';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** A 56 px menu row (P9 M7): icon 20, label 17 semibold, pressed with `foreground` at 10 %. */
function MenuItem({ icon, label, onPress }: { icon: PhosphorIcon; label: string; onPress: () => void }) {
	const reduceMotion = useReducedMotion();
	const focus = useFocusRing();
	return (
		<Pressable
			role="menuitem"
			onPress={onPress}
			onFocus={focus.onFocus}
			onBlur={focus.onBlur}
			style={focus.ringStyle}
			className={cn(
				'min-h-14 flex-row items-center gap-3 rounded-row px-3 active:bg-foreground/10',
				!reduceMotion && 'active:scale-[0.98]'
			)}
		>
			<Icon as={icon} />
			<Text className="min-w-0 flex-1 font-sans-semibold text-control-lg">{label}</Text>
		</Pressable>
	);
}

/**
 * P9 slot C, "Več možnosti": the overflow beside slot A that opens a sheet menu. Visitors get "Prijavi zlorabo" (the
 * P10 sheet, TASK-25.4); owners get "Zaključi iskanje" instead (TASK-26.5; "Povečaj doseg" joins it in M4). Until those
 * tasks fill their item it closes the menu. "Kopiraj povezavo" waits for a clipboard module.
 */
export function SlotC({ report }: ReportSlotProps) {
	const t = useTranslations('report');
	const tc = useTranslations('common');
	const [open, setOpen] = React.useState(false);
	const close = () => setOpen(false);
	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" aria-label={t('more')}>
					<Icon as={DotsThreeIcon} size={24} />
				</Button>
			</SheetTrigger>
			<SheetContent closeLabel={tc('close')}>
				<SheetTitle>{t('more')}</SheetTitle>
				<View role="menu" aria-label={t('more')} className="-mx-2 gap-1 pt-3">
					{report.is_mine ? (
						<MenuItem icon={XCircleIcon} label={t('owner_close')} onPress={close} />
					) : (
						<MenuItem icon={FlagIcon} label={t('more_abuse')} onPress={close} />
					)}
				</View>
				<Button variant="text" className="mt-3" onPress={close}>
					{tc('cancel')}
				</Button>
			</SheetContent>
		</Sheet>
	);
}
