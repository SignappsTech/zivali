import * as WebBrowser from 'expo-web-browser';

import { openCheckout } from '@zivali/api/payments';

let browserOpen = false;

/** True while the checkout browser is open: its return link belongs to the hand-off, not the router (+native-intent). */
export const checkoutOpen = () => browserOpen;

/**
 * Opens Stripe Checkout (the mock provider's /dev/checkout locally) in the in-app browser (A-014: web checkout, no
 * native purchase UI) and resolves when it returns through zivali://payments/return or the user closes it. Only
 * `canceled=1` is read from the return URL; the payment id is the caller's, so an https page that bounces to
 * zivali://payments/return (if Stripe refuses the custom scheme) only has to keep that flag.
 */
export async function payInBrowser(checkoutUrl: string): Promise<{ canceled: boolean }> {
	browserOpen = true;
	try {
		const result = await openCheckout(WebBrowser.openAuthSessionAsync, checkoutUrl);
		return { canceled: result.type !== 'success' || /[?&]canceled=1(&|#|$)/.test(result.url) };
	} finally {
		browserOpen = false;
	}
}
