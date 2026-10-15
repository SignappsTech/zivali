import type { AiAdapter } from './index.ts';

export function anthropicAi(apiKey: string, model: string): AiAdapter {
	return {
		async vision({ prompt, images }) {
			const res = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
				body: JSON.stringify({
					model,
					max_tokens: 1024,
					messages: [
						{
							role: 'user',
							content: [
								...images.map((i) => ({
									type: 'image',
									source: { type: 'base64', media_type: i.mediaType, data: i.base64 },
								})),
								{ type: 'text', text: prompt },
							],
						},
					],
				}),
			});
			if (!res.ok) throw new Error(`anthropic: HTTP ${res.status}`);
			const json = (await res.json()) as { content: { type: string; text?: string }[] };
			return { text: json.content.map((c) => c.text ?? '').join('') };
		},
	};
}
