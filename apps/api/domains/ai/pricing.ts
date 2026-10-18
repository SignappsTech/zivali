// Anthropic prices in USD per million tokens, per model (C19 §Provider call; first-party API rates, 2026-10). Haiku
// 5.5's rate holds for prompts up to 100K tokens, far above one photo. Stored in ai_calls.cost_usd for the monthly cap.
const PRICES: Record<string, { input: number; output: number }> = {
	'claude-haiku-5-5': { input: 0.1, output: 0.5 },
	'claude-sonnet-5-5': { input: 2, output: 10 },
};
// A model missing here is booked at the dearest listed rate, so the budget never undercounts.
const DEAREST = PRICES['claude-sonnet-5-5']!;

/** USD for one call, rounded to the column's 6 decimals. */
export function costUsd(model: string, input_tokens: number, output_tokens: number): string {
	const price = PRICES[model] ?? DEAREST;
	return ((input_tokens * price.input + output_tokens * price.output) / 1e6).toFixed(6);
}
