const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
// Walk up to the monorepo root (apps/misc/friend-tracker → ../../..)
const workspaceRoot = path.resolve(projectRoot, '../../..');

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

config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) => {
      // React family always resolves from the app
      if (singletonPackages.includes(name)) {
        return path.resolve(appModules, name);
      }
      // Everything else: try app node_modules first, then workspace root
      const appPath = path.resolve(appModules, name);
      if (fs.existsSync(appPath)) return appPath;
      return path.resolve(rootModules, name);
    },
  }
);

module.exports = withNativeWind(config, { input: './global.css' });
