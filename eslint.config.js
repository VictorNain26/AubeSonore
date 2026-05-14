import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.turbo/**',
      '**/.next/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/metro.config.js',
      '**/scripts/**',
      '**/drizzle/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Typed linting only on app source (not test/setup helpers)
  {
    files: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    },
  },

  // Import plugin - flat config
  {
    files: ['apps/*/src/**/*.{ts,tsx}', 'packages/*/src/**/*.{ts,tsx}'],
    plugins: { import: importPlugin },
    rules: {
      'import/no-cycle': ['error', { maxDepth: 10 }],
      'import/no-self-import': 'error',
      'import/no-useless-path-segments': 'error',
    },
  },

  {
    files: ['apps/frontend/**/*.{ts,tsx}', 'apps/mobile/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
    },
  },

  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  {
    files: ['apps/backend/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['packages/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'warn',
    },
  },

  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },

  prettierConfig
);
