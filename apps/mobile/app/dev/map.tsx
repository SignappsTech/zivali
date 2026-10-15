import { Redirect } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Circle } from '@/components/map/features';
import { MapView } from '@/components/map/map-view';
import { seedMarkers } from '@/components/map/seed';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';

const markers = seedMarkers(500);
const circles: Circle[] = [{ id: 'alert', center: { lat: 46.0569, lng: 14.5058 }, radiusM: 3000, kind: 'alert' }];
const BAR = 56;

/**
 * MapView with 500 seeded markers (TASK-15.4 AC 3: record panning and zooming on a mid-range Android dev build). Dev
 * route `/dev/map`, never in production. The bar shows the last pressed marker, so presses can be checked too.
 */
export default function DevMapScreen() {
	const [pressed, setPressed] = React.useState('-');
	if (env.EXPO_PUBLIC_APP_ENV === 'production') return <Redirect href="/" />;
	return (
		<SafeAreaView className="flex-1 bg-background">
			<MapView
				markers={markers}
				cluster
				circles={circles}
				initialView={{ center: { lat: 46.0569, lng: 14.5058 }, zoom: 11 }}
				onMarkerPress={setPressed}
				bottomInset={BAR}
				textAlternative={markers.map((m) => (
					<Text key={m.id}>{m.label}</Text>
				))}
			/>
			<View className="absolute inset-x-0 bottom-0 justify-center bg-card px-5" style={{ height: BAR }}>
				<Text>{pressed}</Text>
			</View>
		</SafeAreaView>
	);
}
