import { Tabs } from 'expo-router/tabs';

import { TabBar } from '@/components/shell/tab-bar';

// The four items of the bottom navigation, in this order; visible signed in and signed out (P2).
export default function TabsLayout() {
	return (
		<Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
			<Tabs.Screen name="index" />
			<Tabs.Screen name="inbox" />
			<Tabs.Screen name="report" />
			<Tabs.Screen name="profile" />
		</Tabs>
	);
}
