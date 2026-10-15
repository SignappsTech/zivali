import { EMBED_DIM, type EmbedderAdapter } from './index.ts';

export function voyageEmbedder(apiKey: string): EmbedderAdapter {
	return {
		async embed(inputs) {
			const res = await fetch('https://api.voyageai.com/v1/multimodalembeddings', {
				method: 'POST',
				headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
				body: JSON.stringify({
					model: 'voyage-multimodal-3',
					inputs: inputs.map((i) => ({
						content: [
							i.text
								? { type: 'text', text: i.text }
								: { type: 'image_base64', image_base64: `data:image/jpeg;base64,${i.imageBase64}` },
						],
					})),
				}),
			});
			if (!res.ok) throw new Error(`voyage: HTTP ${res.status}`);
			const out = ((await res.json()) as { data: { embedding: number[] }[] }).data.map((d) => d.embedding);
			if (out.some((v) => v.length !== EMBED_DIM)) throw new Error('voyage: unexpected embedding size');
			return out;
		},
	};
}
