// expo/metro-config detects the pnpm workspace (watch folders, hoisted node_modules). @zivali/* resolve from this
// checkout's packages through tsconfig.json `paths` (Expo's tsconfigPaths, on by default), before node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

module.exports = withNativeWind(getDefaultConfig(__dirname), { input: './global.css', inlineRem: 16 });
