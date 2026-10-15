'use client';

import { CheckCircleIcon, InfoIcon, WarningCircleIcon } from '@phosphor-icons/react/ssr';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const iconClass = 'size-[22px] shrink-0';

/**
 * Toasts (system §10.9): popover surface, radius 20, one shadow (shadow-pop), 15/22, status icon, 5 s, dismissible,
 * announced politely. Bottom centre, 24 px from the edge (12 px on mobile). Call `toast(...)` from `sonner`.
 */
function Toaster({ closeLabel, label, ...props }: ToasterProps & { closeLabel: string; label: string }) {
	return (
		<Sonner
			position="bottom-center"
			duration={5000}
			closeButton
			offset={24}
			mobileOffset={12}
			containerAriaLabel={label}
			icons={{
				success: <CheckCircleIcon weight="fill" aria-hidden="true" className={`${iconClass} text-primary`} />,
				info: <InfoIcon weight="fill" aria-hidden="true" className={`${iconClass} text-primary`} />,
				warning: <WarningCircleIcon weight="fill" aria-hidden="true" className={`${iconClass} text-destructive`} />,
				error: <WarningCircleIcon weight="fill" aria-hidden="true" className={`${iconClass} text-destructive`} />,
			}}
			style={{ '--width': '400px' } as React.CSSProperties}
			toastOptions={{
				unstyled: true,
				closeButtonAriaLabel: closeLabel,
				classNames: {
					toast: 'flex w-full min-h-14 items-center gap-3 rounded-row bg-popover py-1.5 pr-1.5 pl-4 font-sans text-[15px] leading-[22px] text-popover-foreground shadow-pop',
					icon: 'flex shrink-0',
					content: 'min-w-0 flex-1',
					// Sonner renders the close button first; it sits at the end, as in the P23 mockup.
					closeButton:
						'order-last grid size-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-foreground/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring [&>svg]:size-6',
				},
			}}
			{...props}
		/>
	);
}

export { Toaster };
