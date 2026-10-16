'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
	type CameraState,
	type Circle,
	type Marker,
	MapView,
	type MapViewHandle,
	type Path,
} from '@/components/map/map-view';
import { Button } from '@/components/ui/button';

const LJUBLJANA = { lat: 46.0569, lng: 14.5058 };

/** The dev page's MapView with its hooks wired to readouts, so e2e can check them against real MapLibre. */
export function MapDemo({ markers, circles, paths }: { markers: Marker[]; circles: Circle[]; paths: Path[] }) {
	const t = useTranslations('map');
	const map = React.useRef<MapViewHandle>(null);
	const [camera, setCamera] = React.useState<CameraState>();
	const [pressed, setPressed] = React.useState<string>();

	return (
		<>
			<div className="flex flex-wrap items-center gap-4">
				<Button variant="secondary" size="sm" onClick={() => map.current?.moveTo(LJUBLJANA, 13)}>
					Ljubljana
				</Button>
				<output data-testid="camera">
					{camera &&
						`${camera.center.lat.toFixed(4)},${camera.center.lng.toFixed(4)} z${camera.zoom.toFixed(1)} ${camera.moving ? 'moving' : 'idle'}`}
				</output>
				<output data-testid="pressed">{pressed}</output>
			</div>
			<MapView
				ref={map}
				testID="dev-map"
				height={560}
				cluster
				markers={markers}
				circles={circles}
				paths={paths}
				onCameraChange={setCamera}
				onMarkerPress={setPressed}
				textAlternative={
					<section aria-labelledby="dev-map-list" className="grid gap-2 pt-6">
						<h2 id="dev-map-list" className="font-display text-2xl font-bold">
							{t('text_alternative', { place: 'Slovenija' })}
						</h2>
						<ul className="grid gap-1">
							{markers.slice(0, 20).map((marker) => (
								<li key={marker.id}>{marker.label}</li>
							))}
						</ul>
					</section>
				}
			/>
		</>
	);
}
