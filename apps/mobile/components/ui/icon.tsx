import { cssInterop } from 'nativewind';
import type { IconProps, Icon as PhosphorIcon } from 'phosphor-react-native';
import * as React from 'react';

import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type Props = IconProps & { as: PhosphorIcon; className?: string };

function IconImpl({ as: IconComponent, ...props }: Props) {
	return <IconComponent {...props} />;
}

// RN Reusables icon pattern: a text colour class becomes the icon's colour prop, a size-* class its size.
cssInterop(IconImpl, {
	className: { target: 'style', nativeStyleToProp: { color: true, height: 'size', width: 'size' } },
});

/**
 * Phosphor icon (system §8) that takes the text colour of its parent (Button, Badge, StatusLabel), like an inline SVG
 * on web. Bold 20 by default (controls); pass `weight="fill"` for status icons. Import icons by path
 * (`phosphor-react-native/src/icons/X`) so Metro does not load the whole set.
 */
function Icon({ as, className, size = 20, weight = 'bold', ...props }: Props) {
	const textClass = React.useContext(TextClassContext);
	return (
		<IconImpl
			as={as}
			className={cn('text-foreground', textClass, className)}
			size={size}
			weight={weight}
			{...props}
		/>
	);
}

export { Icon };
