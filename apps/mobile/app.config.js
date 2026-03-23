const baseConfig = require('./app.json');
const packageJson = require('./package.json');

function computeAndroidVersionCode(version) {
  const coreVersion = String(version || '0.0.0').split('-')[0];
  const parts = coreVersion.split('.').map((part) => {
    const value = Number.parseInt(part, 10);
    return Number.isFinite(value) ? value : 0;
  });
  while (parts.length < 3) {
    parts.push(0);
  }
  return (parts[0] * 10000) + (parts[1] * 100) + parts[2];
}

module.exports = ({ config }) => {
  const expoConfig = config ?? baseConfig.expo ?? {};
  const version = String(packageJson.version || '0.0.0');
  const appleTeamId = process.env.EXPO_APPLE_TEAM_ID?.trim();

  return {
    ...expoConfig,
    version,
    ios: {
      ...expoConfig.ios,
      ...(appleTeamId ? { appleTeamId } : {}),
    },
    android: {
      ...expoConfig.android,
      versionCode: computeAndroidVersionCode(version),
    },
  };
};
