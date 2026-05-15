import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import type { PluginOption } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_URL;

  return {
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        injectManifest: {
          // Exclude resvg's ~2.5 MB wasm from the install-time precache —
          // shares are an explicit user action, so paying that bandwidth
          // upfront for every PWA install is wasteful. The wasm is cached
          // at runtime on first share (see src/sw.ts: registerRoute *.wasm).
          globIgnores: ['**/*.wasm'],
        },
        includeAssets: [
          'favicon.png',
          'favicon-48.png',
          'robots.txt',
          'sitemap.xml',
          'llms.txt',
          'icons/apple-touch-icon.png',
        ],
        manifest: {
          name: 'AubeSonore',
          short_name: 'AubeSonore',
          description: 'Webradio de découverte musicale indépendante',
          theme_color: '#0f1118',
          background_color: '#0f1118',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
      visualizer({
        filename: 'stats.html',
        emitFile: true,
        gzipSize: true,
        brotliSize: true,
      }) as PluginOption,
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: apiBaseUrl
        ? {
            '/api': {
              target: apiBaseUrl,
              changeOrigin: true,
            },
          }
        : undefined,
      cors: {
        origin: true,
        credentials: true,
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules')) {
              if (id.includes('framer-motion')) return 'motion';
              if (id.includes('@radix-ui')) return 'radix';
              if (id.includes('react-dom') || id.endsWith('/react/index.js')) return 'react-vendor';
            }
            return undefined;
          },
        },
      },
    },
  };
});
