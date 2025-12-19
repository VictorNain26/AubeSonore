import baseConfig from './base.js';

export default [
  ...baseConfig,
  {
    files: ['**/*.tsx', '**/*.jsx'],
    rules: {
      'react/react-in-jsx-scope': 'off',
    },
  },
];
