import type { StorybookConfig } from '@storybook/react-vite';

import { dirname } from 'path';

import { fileURLToPath } from 'url';

// Resolves package paths for pnpm monorepos (recommended by the Storybook init).
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [getAbsolutePath('@storybook/addon-a11y'), getAbsolutePath('@storybook/addon-docs')],
  framework: getAbsolutePath('@storybook/react-vite'),
  viteFinal: (viteConfig) => {
    // The app's vite.config registers vite-plugin-pwa, whose service-worker
    // precache chokes on Storybook's runtime bundles — irrelevant here anyway.
    viteConfig.plugins = viteConfig.plugins
      ?.flat()
      .filter(
        (p) => !(p && typeof p === 'object' && 'name' in p && p.name.startsWith('vite-plugin-pwa'))
      );
    return viteConfig;
  },
};
export default config;
