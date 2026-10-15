/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
	presets: [require('nativewind/preset'), require('@zivali/tokens/tailwind-preset')],
	plugins: [require('tailwindcss-animate')],
};
