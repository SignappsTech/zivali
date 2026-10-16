import { Redirect } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LocationPicker } from '@/components/location/location-picker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { env } from '@/lib/env';

const MODES = ['lost', 'found', 'sighted', 'alert'] as const;
const PHOTO = { lat: 46.0612, lng: 14.5021, source: 'exif' } as const;

/**
 * LocationPicker in each mode, with a sample photo location (TASK-15.5 AC 3: check TalkBack names and 44 px targets on
 * an Android dev build). Dev route `/dev/picker`, never in production. The line under the modes shows what Confirm
 * handed `onChange` (always the coarsened point).
 */
export default function DevPickerScreen() {
	const [mode, setMode] = React.useState<(typeof MODES)[number]>('lost');
	const [confirmed, setConfirmed] = React.useState('-');
	if (env.EXPO_PUBLIC_APP_ENV === 'production') return <Redirect href="/" />;
	return (
		<SafeAreaView edges={['top']} className="flex-1 bg-background">
			<View className="flex-row flex-wrap px-2">
				{MODES.map((m) => (
					<Button key={m} variant={m === mode ? 'secondary' : 'text'} size="sm" onPress={() => setMode(m)}>
						{m}
					</Button>
				))}
			</View>
			<Text className="px-5 text-sm text-muted-foreground">{confirmed}</Text>
			<LocationPicker
				key={mode}
				mode={mode}
				suggested={PHOTO}
				onChange={(v) => setConfirmed(JSON.stringify(v))}
			/>
		</SafeAreaView>
	);
}
