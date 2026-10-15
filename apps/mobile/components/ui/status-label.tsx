import type { Icon as PhosphorIcon } from 'phosphor-react-native';
import { EyeIcon } from 'phosphor-react-native/src/icons/Eye';
import { HandHeartIcon } from 'phosphor-react-native/src/icons/HandHeart';
import { HeartIcon } from 'phosphor-react-native/src/icons/Heart';
import { MegaphoneIcon } from 'phosphor-react-native/src/icons/Megaphone';
import * as React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text, TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type Status = 'lost' | 'found' | 'sighted' | 'reunited';

/** Fill icons per status (system §8); also for the tonal Badge. */
const statusIcons: Record<Status, PhosphorIcon> = {
	lost: MegaphoneIcon,
	found: HandHeartIcon,
	sighted: EyeIcon,
	reunited: HeartIcon,
};

const statusColors: Record<Status, string> = {
	lost: 'text-status-lost-subtle-foreground',
	found: 'text-status-found-subtle-foreground',
	sighted: 'text-status-sighted-subtle-foreground',
	reunited: 'text-status-reunited-subtle-foreground',
};

/** Status word: fill icon 16 + word 14 bold in the status colour, never colour alone (system §10.5). */
function StatusLabel({
	status,
	className,
	children,
	...props
}: React.ComponentProps<typeof View> & { status: Status; children: React.ReactNode }) {
	return (
		<TextClassContext.Provider value={cn('font-sans-bold text-sm', statusColors[status])}>
			<View accessible className={cn('flex-row items-center gap-[5px] self-start', className)} {...props}>
				<Icon as={statusIcons[status]} weight="fill" size={16} />
				<Text>{children}</Text>
			</View>
		</TextClassContext.Provider>
	);
}

export { type Status, statusIcons, StatusLabel };
