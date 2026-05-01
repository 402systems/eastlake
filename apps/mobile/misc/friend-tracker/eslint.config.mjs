import { defineConfig } from 'eslint/config';
import { baseConfig } from '@eastlake/lib-core-eslint';

export default defineConfig([
  ...baseConfig,
  {
    ignores: [
      'metro.config.js',
      'babel.config.js',
      'tailwind.config.js',
    ],
  },
]);
