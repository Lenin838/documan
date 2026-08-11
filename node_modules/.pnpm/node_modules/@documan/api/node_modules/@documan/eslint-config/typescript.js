import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export const typescriptConfig = defineConfig([
  globalIgnores([
    'dist',
    'build',
    'coverage',
    '.turbo',
    'node_modules',
  ]),

  {
    files: ['**/*.{ts,tsx}'],

    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
  },
]);

export default typescriptConfig;