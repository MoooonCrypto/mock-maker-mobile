const app = require('./app.json');
const pkg = require('./package.json');

function hasPlugin(plugins, name) {
  return plugins.some((plugin) => Array.isArray(plugin) ? plugin[0] === name : plugin === name);
}

module.exports = () => {
  const config = JSON.parse(JSON.stringify(app));
  const plugins = [...(config.expo.plugins ?? [])];
  const autolinking = {
    ...(pkg.expo?.autolinking ?? {}),
    ...(config.expo.autolinking ?? {}),
  };
  const profile = process.env.EAS_BUILD_PROFILE;
  const useDevClient =
    process.env.EXPO_USE_DEV_CLIENT === '1' ||
    profile === 'development' ||
    profile === 'development-simulator';

  if (useDevClient && !hasPlugin(plugins, 'expo-dev-client')) {
    plugins.unshift('expo-dev-client');
  }

  const currentExclude = new Set(autolinking.exclude ?? []);
  if (useDevClient) {
    currentExclude.delete('expo-dev-client');
  } else {
    currentExclude.add('expo-dev-client');
  }

  config.expo.plugins = plugins;
  config.expo.autolinking = {
    ...autolinking,
    exclude: Array.from(currentExclude),
  };
  config.expo.extra = {
    ...(config.expo.extra ?? {}),
    revenueCatAppleApiKey:
      process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ??
      config.expo.extra?.revenueCatAppleApiKey,
    revenueCatGoogleApiKey:
      process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY ??
      config.expo.extra?.revenueCatGoogleApiKey,
    revenueCatEntitlementId:
      process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ??
      config.expo.extra?.revenueCatEntitlementId ??
      'pro',
  };
  return config;
};
