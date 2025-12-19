import baseConfig from './base.js';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
