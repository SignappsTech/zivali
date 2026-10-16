import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { DotsThreeIcon } from 'phosphor-react-native/src/icons/DotsThree';
import { FlagIcon } from 'phosphor-react-native/src/icons/Flag';
import { XCircleIcon } from 'phosphor-react-native/src/icons/XCircle';
import * as React from 'react';
import { Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTranslations } from 'use-intl';

import { ReportAbuse } from '@/components/abuse/report-abuse';
import type { ReportSlotProps } from '@/components/report/slots/types';
import { Button } from '@/components/ui/button';
import { useFocusRing } from '@/components/ui/focus-ring';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** A 56 px menu row (P9 M7): icon 20, label 17 semibold, pressed with `foreground` at 10 %. Also the chat menu (P12). */
export function MenuItem({ icon, label, onPress }: { icon: PhosphorIcon; label: string; onPress: () => void }) {
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
 * P9 slot C, "Več možnosti": the overflow beside slot A that opens a sheet menu. Visitors get "Prijavi zlorabo", which
 * turns the same sheet into the P10 form (one sheet, so focus returns to this button when it closes); owners get
 * "Zaključi iskanje" instead (TASK-26.5; "Povečaj doseg" joins it in M4), which closes the menu until that task fills
 * it. "Kopiraj povezavo" waits for a clipboard module.
 */
export function SlotC({ report, offline }: ReportSlotProps) {
	const t = useTranslations('report');
	const tb = useTranslations('browse');
	const tc = useTranslations('common');
	const [open, setOpen] = React.useState(false);
	const [abuse, setAbuse] = React.useState(false);
	const onOpenChange = (next: boolean) => {
		setOpen(next);
		if (!next) setAbuse(false);
	};
	const close = () => onOpenChange(false);
	// The screen's h1: the name, else the P4 row title.
	const title = report.name ?? tb(`row_title_${report.type}`, { species: report.species });
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetTrigger asChild>
				<Button variant="ghost" size="icon" aria-label={t('more')}>
					<Icon as={DotsThreeIcon} size={24} />
				</Button>
			</SheetTrigger>
			<SheetContent closeLabel={tc('close')}>
				{abuse ? (
					<ReportAbuse target={{ type: 'report', id: report.id, title }} offline={offline} onClose={close} />
				) : (
					<>
						<SheetTitle>{t('more')}</SheetTitle>
						<View role="menu" aria-label={t('more')} className="-mx-2 gap-1 pt-3">
							{report.is_mine ? (
								<MenuItem icon={XCircleIcon} label={t('owner_close')} onPress={close} />
							) : (
								<MenuItem icon={FlagIcon} label={t('more_abuse')} onPress={() => setAbuse(true)} />
							)}
						</View>
						<Button variant="text" className="mt-3" onPress={close}>
							{tc('cancel')}
						</Button>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
