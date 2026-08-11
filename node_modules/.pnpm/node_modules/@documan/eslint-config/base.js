import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';

export const baseConfig = defineConfig([
  globalIgnores([
    'dist',
    'build',
    'coverage',
    '.turbo',
    'node_modules',
  ]),

  {
    files: ['**/*.{js,mjs,cjs}'],

    extends: [
      js.configs.recommended,
    ],
  },
]);

export default baseConfig;