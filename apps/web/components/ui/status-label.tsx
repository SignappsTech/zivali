import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { HandHeartIcon } from '@phosphor-icons/react/dist/ssr/HandHeart';
import { HeartIcon } from '@phosphor-icons/react/dist/ssr/Heart';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/ssr/Megaphone';
import * as React from 'react';

import { cn } from '@/lib/utils';

type Status = 'lost' | 'found' | 'sighted' | 'reunited';

/** Fill icons per status (system §8); also for the tonal Badge. */
const statusIcons: Record<Status, Icon> = {
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
function StatusLabel({ status, className, children, ...props }: React.ComponentProps<'span'> & { status: Status }) {
	const StatusIcon = statusIcons[status];
	return (
		<span
			data-slot="status-label"
			data-status={status}
			className={cn(
				'inline-flex items-center gap-[5px] text-sm font-bold whitespace-nowrap',
				statusColors[status],
				className
			)}
			{...props}
		>
			<StatusIcon weight="fill" aria-hidden="true" className="size-4 shrink-0" />
			{children}
		</span>
	);
}

export { type Status, statusIcons, StatusLabel };
