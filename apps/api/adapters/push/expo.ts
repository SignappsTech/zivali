import type { PushAdapter, PushResult } from './index.ts';

export function expoPush(accessToken?: string): PushAdapter {
	return {
		async send(messages) {
			const res = await fetch('https://exp.host/--/api/v2/push/send', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					...(accessToken && { authorization: `Bearer ${accessToken}` }),
				},
				body: JSON.stringify(messages),
			});
			if (!res.ok) throw new Error(`expo: HTTP ${res.status}`);
			const json = (await res.json()) as { data: { status: string; details?: { error?: string } }[] };
			return json.data.map((t): PushResult =>
				t.status === 'ok'
					? { status: 'ok' }
					: {
							status: 'error',
							error: t.details?.error === 'DeviceNotRegistered' ? 'DeviceNotRegistered' : 'Other',
						}
			);
		},
	};
}
