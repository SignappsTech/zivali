import { Redirect } from 'expo-router';
import * as React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckoutSheet } from '@/components/payments/checkout';
import { Button } from '@/components/ui/button';
import { env } from '@/lib/env';

/**
 * Dev route `/dev/pay`, never in production: a 5 € `support` payment through the hand-off, so the mock provider (or
 * Stripe test mode) can be tried end to end on a dev build before the support asks exist (TASK-33.3). Signed in only.
 */
export default function DevPay() {
	const [open, setOpen] = React.useState(false);
	if (env.EXPO_PUBLIC_APP_ENV === 'production') return <Redirect href="/" />;
	return (
		<SafeAreaView className="flex-1 justify-center bg-background px-5">
			<Button size="lg" onPress={() => setOpen(true)}>
				Test payment 5 €
			</Button>
			<CheckoutSheet
				open={open}
				onOpenChange={setOpen}
				checkout={{ purpose: 'support', amountCents: 500, returnTo: '/' }}
			/>
		</SafeAreaView>
	);
}
