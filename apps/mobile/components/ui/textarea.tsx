import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/** Same line style and states as Input, at least 96 px high. */
function Textarea({ className, ...props }: React.ComponentProps<typeof Input>) {
	return <Input multiline textAlignVertical="top" className={cn('min-h-24 leading-7', className)} {...props} />;
}

export { Textarea };
