import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckoutResult } from '@/components/payments/checkout';

/**
 * zivali://payments/return?payment_id=…[&canceled=1] (C13, C15) when no hand-off sheet is waiting for it, e.g. the app
 * was closed while the browser was open. While the sheet is open, +native-intent keeps this route off the stack.
 * No ads here (C15 protected flow).
 */
export default function PaymentReturn() {
	const router = useRouter();
	const { payment_id: paymentId, canceled } = useLocalSearchParams<{ payment_id?: string; canceled?: string }>();
	if (!paymentId) return <Redirect href="/" />;
	return (
		<SafeAreaView className="flex-1 justify-center bg-background px-5 pb-8">
			<CheckoutResult
				paymentId={paymentId}
				canceled={canceled === '1'}
				onClose={() => (router.canGoBack() ? router.back() : router.replace('/'))}
			/>
		</SafeAreaView>
	);
}
