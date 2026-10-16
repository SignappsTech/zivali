'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { LocationPicker, type LocationPickerProps } from '@/components/location/location-picker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export type Mode = LocationPickerProps['mode'];
type Picked = Parameters<LocationPickerProps['onChange']>[0];

// Sample points: a photo taken in Rožna dolina, a stored (already coarsened) report point in Šiška.
const EXIF = { lat: 46.0489, lng: 14.4691, source: 'exif' as const };
const STORED = { point: { lat: 46.070213, lng: 14.487456 }, radiusM: 1000 };

/** The dev page's picker with its onChange output, so e2e can check what leaves the component. */
export function LocationDemo({
	mode,
	exif,
	stored,
	dialog,
}: {
	mode: Mode;
	exif: boolean;
	stored: boolean;
	dialog: boolean;
}) {
	const tc = useTranslations('common');
	const [picked, setPicked] = React.useState<Picked>();
	const props: LocationPickerProps = {
		mode,
		onChange: setPicked,
		...(exif && { suggested: EXIF }),
		...(stored && { value: STORED }),
	};

	return (
		<>
			{dialog ? (
				<Dialog>
					<DialogTrigger asChild>
						<Button variant="secondary">LocationPicker</Button>
					</DialogTrigger>
					<DialogContent closeLabel={tc('close')} aria-describedby={undefined} className="max-w-[600px] p-7">
						<LocationPicker {...props} variant="dialog" />
					</DialogContent>
				</Dialog>
			) : (
				<LocationPicker {...props} />
			)}
			<output data-testid="picked" className="mt-6 block font-mono text-sm">
				{picked && JSON.stringify(picked)}
			</output>
		</>
	);
}
