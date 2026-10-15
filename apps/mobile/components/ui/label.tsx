import * as React from 'react';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** Field label above the control: 15/20 bold (system §10.3). `nativeID` lets a control name itself after it. */
function Label({ className, ...props }: React.ComponentProps<typeof Text>) {
	return <Text className={cn('font-sans-bold text-control', className)} {...props} />;
}

export { Label };
