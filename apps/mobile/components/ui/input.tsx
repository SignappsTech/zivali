import * as React from 'react';
import { TextInput, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { useFormField } from '@/components/ui/form-field';
import { useColors } from '@/lib/theme';
import { cn } from '@/lib/utils';

// System §10.3 line field: no box, 2 px input underline; focus ring + 2 px, error destructive + 2 px (the bottom
// padding gives the extra 2 px back, so nothing moves), disabled dashed so it is not colour only.
const fieldLine = 'min-w-0 border-b-2 border-input bg-transparent px-0.5 pb-1.5 pt-2 font-sans text-lg text-foreground';
const lineFocused = 'border-b-4 border-ring pb-1';
const lineInvalid = 'border-b-4 border-destructive pb-1';

/** The dashed disabled underline. Borders cannot dash one side reliably on both platforms, so it is drawn. */
function DisabledLine() {
	const { input } = useColors();
	return (
		<Svg aria-hidden height={2} width="100%" style={{ position: 'absolute', bottom: 0, left: 0 }}>
			<Line x1="0" y1="1" x2="100%" y2="1" stroke={input} strokeWidth={2} strokeDasharray="6 4" />
		</Svg>
	);
}

function Input({ className, editable, ...props }: React.ComponentProps<typeof TextInput>) {
	const { invalid, disabled, ...field } = useFormField();
	const colors = useColors();
	const off = disabled || editable === false;

	return (
		<View>
			<TextInput
				className={cn(
					fieldLine,
					'min-h-14',
					invalid ? lineInvalid : 'focus:border-b-4 focus:border-ring focus:pb-1',
					off && 'border-b-0 pb-2 text-muted-foreground',
					className
				)}
				editable={!off}
				aria-disabled={off || undefined}
				placeholderTextColor={colors['muted-foreground']}
				maxFontSizeMultiplier={2}
				{...field}
				{...props}
			/>
			{off && <DisabledLine />}
		</View>
	);
}

export { DisabledLine, fieldLine, Input, lineFocused, lineInvalid };
