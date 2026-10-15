// expo/metro-config detects the pnpm workspace (watch folders, hoisted node_modules), so @zivali/* resolve as is.
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

module.exports = withNativeWind(getDefaultConfig(__dirname), { input: './global.css', inlineRem: 16 });
