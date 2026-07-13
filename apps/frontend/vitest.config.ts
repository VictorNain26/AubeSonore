import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/mocks/setup.ts'],
    env: {
      VITE_API_URL: 'http://localhost:3000',
      VITE_AZURACAST_BASE_URL: 'https://radio.aubesonore.fr',
      VITE_STATION_SHORTCODE: 'aubesonore',
    },
    server: {
      deps: {
        inline: ['@testing-library/react'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/mocks/**',
        'src/test-utils.tsx',
        // Visual-only / heavily DOM-coupled — covered by manual QA, not unit tests
        'src/App.tsx',
        'src/main.tsx',
        'src/sw.ts',
        'src/vite-env.d.ts',
        'src/types/**',
        'src/layout/**',
        'src/pages/**',
        'src/components/LikedTracksModal.tsx',
        'src/components/PWAInstallBanner.tsx',
        'src/components/Player/TrackArtwork.tsx',
        'src/components/Player/TrackMeta.tsx',
        'src/components/Player/Timeline.tsx',
        'src/components/Player/PlaybackControls.tsx',
        'src/components/Player/SecondaryControls.tsx',
        'src/components/Player/LibraryButton.tsx',
        'src/components/Player/ListenersBadge.tsx',
        'src/components/AuthModalHost.tsx',
        'src/components/Player/WaveformCanvas.tsx',
        'src/components/Player/ElapsedReadout.tsx',
        'src/components/Player/HistoryItem.tsx',
        'src/components/Player/VolumeControl.tsx',
        'src/components/Player/CastButton.tsx',
        'src/components/Player/SleepTimer.tsx',
        'src/components/Player/ArtistContext.tsx',
        'src/components/Player/index.tsx',
        'src/components/Player/utils.ts',
        'src/components/Player/motion-presets.ts',
        'src/components/Player/PlayerSideEffects.tsx',
        'src/components/AuthInit.tsx',
        'src/components/NowPlayingPoller.tsx',
        'src/components/AmbientBackground.tsx',
        // Player-domain hooks — pure logic extracted from src/components/Player/index.tsx
        // (which is itself excluded above). Covered by manual QA on the Player.
        'src/hooks/player/**',
        'src/hooks/useStationHistory.ts',
        // UI primitives — thin wrappers over Radix; behavior validated visually.
        'src/components/ui/**',
        // External SDK wrappers — covered by browser, not unit tests
        'src/lib/cast/**',
        'src/lib/exportLibrary.ts',
        // Browser-only Cast/AirPlay event bridges (same rationale as lib/cast/**)
        'src/stores/castStore.ts',
      ],
      // Floor thresholds — ratchet up as coverage grows.
      // Current actual: ~85% statements/functions/lines, ~60% branches on remaining surface.
      thresholds: {
        statements: 70,
        branches: 50,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react-dom/client': path.resolve(__dirname, '../../node_modules/react-dom/client'),
    },
    dedupe: ['react', 'react-dom'],
  },
});
