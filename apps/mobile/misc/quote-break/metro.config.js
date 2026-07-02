const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
// Walk up to the monorepo root (apps/mobile/misc/quote-break → ../../../..)
const workspaceRoot = path.resolve(projectRoot, '../../../..');

const config = getDefaultConfig(projectRoot);

// Let Metro watch all workspace packages
config.watchFolders = [workspaceRoot];

// Resolve modules from both the app and the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Force React to a single copy (prevents "Invalid hook call") while letting
// all other modules resolve normally from the workspace root
const appModules = path.resolve(projectRoot, 'node_modules');
const rootModules = path.resolve(workspaceRoot, 'node_modules');
const singletonPackages = ['react', 'react-native', 'react-dom'];

// Force React singletons to always resolve from the app — must use resolveRequest
// because extraNodeModules is only a fallback and fires too late (after dir traversal).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletonPackages.includes(moduleName)) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(appModules, '_placeholder_') },
      moduleName,
      platform
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) => {
      // Everything else: try app node_modules first, then workspace root
      const appPath = path.resolve(appModules, name);
      if (fs.existsSync(appPath)) return appPath;
      return path.resolve(rootModules, name);
    },
  }
);

module.exports = withNativeWind(config, { input: './global.css' });
