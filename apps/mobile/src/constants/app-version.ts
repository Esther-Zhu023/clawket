type PackageJson = {
  version?: string;
};

const PACKAGE_JSON = require('../../package.json') as PackageJson;

export const APP_PACKAGE_VERSION = PACKAGE_JSON.version?.trim() || '0.0.0';
