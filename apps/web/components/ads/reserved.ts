import type { AdSlot } from '@zivali/types';

/**
 * P21 reserved sizes (mockup): the feed row 88 px, the detail and reunited units 200 (176 from lg), the sidebar 320 by
 * 452. Its own module, so the admin preview (P20) gets the unit's sizes without importing AdSlot (C15 guard).
 */
export const RESERVED: Record<AdSlot, string> = {
	feed: 'min-h-[88px]',
	detail: 'min-h-[200px] lg:min-h-[176px]',
	reunited: 'min-h-[200px] lg:min-h-[176px]',
	sidebar: 'min-h-[452px] w-full max-w-[320px]',
};
