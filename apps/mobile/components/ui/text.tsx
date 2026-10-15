import * as React from 'react';
import { Text as RNText } from 'react-native';

import { cn } from '@/lib/utils';

/** Classes a parent (Button, Badge, StatusLabel, ChoiceRow) hands to the Text and Icon inside it (RN Reusables pattern). */
const TextClassContext = React.createContext<string | undefined>(undefined);

/**
 * Body text by default (16/24, foreground). OS text scaling is honoured up to 200 % (system §11), so labels wrap and
 * grow instead of clipping; never give a Text a fixed height.
 */
function Text({ className, maxFontSizeMultiplier = 2, ...props }: React.ComponentPropsWithRef<typeof RNText>) {
	const textClass = React.useContext(TextClassContext);
	return (
		<RNText
			className={cn('font-sans text-base text-foreground', textClass, className)}
			maxFontSizeMultiplier={maxFontSizeMultiplier}
			{...props}
		/>
	);
}

export { Text, TextClassContext };
