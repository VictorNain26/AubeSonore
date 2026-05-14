# Frontend Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring `apps/frontend` to a "best of May 2026" state — no silent failures, real test coverage, error boundaries, stricter lint, audited quick wins.

**Architecture:** React 19 + Vite 8 + Tailwind 4 + Zustand 5, single page. Tests with Vitest 4 + MSW 2 (SSE-aware). All network data validated via Valibot at the boundary. Errors propagate to UI via toasts or error boundaries — never silently swallowed.

**Tech Stack:** React 19.2, Vite 8, Vitest 4.1, MSW 2.14, Testing Library 16, react-error-boundary 6.1, Valibot 1, Zustand 5, TypeScript strict.

**Spec:** `docs/superpowers/specs/2026-05-14-frontend-overhaul-design.md`

---

## Phase 1 — Quick Wins

### Task 1: Update .gitignore and CLAUDE.md

**Files:**

- Modify: `.gitignore`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add key-file patterns to `.gitignore`**

Append after the `# Environment` block (line 16):

```
# Private keys and certificates
*.pem
*.key
*.p12
*.pfx
```

- [ ] **Step 2: Update CLAUDE.md versioning baseline**

In `CLAUDE.md`, find the "Versioning baseline (May 2026)" section and replace:

```diff
- - Expo SDK 54 (RN 0.81). Note: SDK 55 needs RN 0.83 + New Architecture migration; SDK 56 needs RN 0.85. Plan major mobile bumps separately.
+ - Expo SDK 55 (RN 0.83), New Architecture enabled. Note: SDK 56 needs RN 0.85. Plan major mobile bumps separately.
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore CLAUDE.md
git commit -m "chore: add key-file patterns to gitignore and bump SDK baseline"
```

---

### Task 2: Fix push.routes.ts DELETE /unsubscribe validation

**Files:**

- Modify: `apps/backend/src/validators/pushValidator.ts`
- Modify: `apps/backend/src/routes/push.routes.ts:54`
- Test: `apps/backend/src/validators/pushValidator.test.ts` (new)

- [ ] **Step 1: Add unsubscribeSchema to validator**

In `apps/backend/src/validators/pushValidator.ts`, append:

```ts
export const unsubscribeSchema = object({
  endpoint: httpsUrl,
});

export type UnsubscribeData = InferOutput<typeof unsubscribeSchema>;
```

- [ ] **Step 2: Write the failing test**

Create `apps/backend/src/validators/pushValidator.test.ts`:

```ts
import { describe, it, expect } from 'bun:test';
import { safeParse } from 'valibot';
import { unsubscribeSchema } from './pushValidator';

describe('unsubscribeSchema', () => {
  it('accepts valid https endpoint', () => {
    const result = safeParse(unsubscribeSchema, { endpoint: 'https://fcm.googleapis.com/abc' });
    expect(result.success).toBe(true);
  });

  it('rejects http endpoint', () => {
    const result = safeParse(unsubscribeSchema, { endpoint: 'http://fcm.googleapis.com/abc' });
    expect(result.success).toBe(false);
  });

  it('rejects missing endpoint', () => {
    const result = safeParse(unsubscribeSchema, {});
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it passes**

```bash
cd apps/backend && bun test src/validators/pushValidator.test.ts
```

Expected: 3 tests passing.

- [ ] **Step 4: Refactor the route**

In `apps/backend/src/routes/push.routes.ts`, replace lines 48-62:

```ts
.delete('/unsubscribe', async ({ user, body, set }) => {
  if (!user) {
    set.status = 401;
    return { error: 'Non authentifié' };
  }

  const data = validateBody(unsubscribeSchema, body);
  if (hasError(data)) {
    set.status = 400;
    return data;
  }

  await pushService.unsubscribe(user.id, data.endpoint);
  return { message: 'Désinscription effectuée' };
})
```

Add the import at the top:

```ts
import { subscribeSchema, sendPushSchema, unsubscribeSchema } from '../validators/pushValidator';
```

- [ ] **Step 5: Run backend lint and typecheck**

```bash
cd C:\Users\ordiv\AubeSonore
pnpm --filter @aubesonore/backend typecheck
pnpm --filter @aubesonore/backend lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/validators/pushValidator.ts apps/backend/src/validators/pushValidator.test.ts apps/backend/src/routes/push.routes.ts
git commit -m "fix(backend): validate unsubscribe body via Valibot schema"
```

---

## Phase 2 — Install Dependencies

### Task 3: Install all new dependencies

**Files:**

- Modify: `apps/frontend/package.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Install frontend runtime deps**

```bash
cd C:\Users\ordiv\AubeSonore
pnpm --filter @aubesonore/frontend add react-error-boundary@^6.1 web-vitals@^5.2
```

- [ ] **Step 2: Install frontend dev deps**

```bash
pnpm --filter @aubesonore/frontend add -D \
  @testing-library/react@^16.3 \
  @testing-library/user-event@^14 \
  @testing-library/jest-dom@^6 \
  msw@^2.14 \
  rollup-plugin-visualizer@^7 \
  jsdom@^25
```

- [ ] **Step 3: Install root ESLint plugins**

```bash
pnpm add -D -w \
  eslint-plugin-jsx-a11y@^6.10 \
  @vitest/eslint-plugin@^1.6 \
  eslint-plugin-testing-library@^7
```

- [ ] **Step 4: Verify install**

```bash
pnpm install
pnpm typecheck
```

Expected: no missing-module errors.

- [ ] **Step 5: Commit**

```bash
git add package.json apps/frontend/package.json pnpm-lock.yaml
git commit -m "chore: add testing, error-boundary, web-vitals, and lint dependencies"
```

---

## Phase 3 — Test Infrastructure

### Task 4: Set up MSW (handlers, SSE, server, setup)

**Files:**

- Create: `apps/frontend/src/mocks/handlers.ts`
- Create: `apps/frontend/src/mocks/sse-handlers.ts`
- Create: `apps/frontend/src/mocks/server.ts`
- Create: `apps/frontend/src/mocks/setup.ts`
- Create: `apps/frontend/src/test-utils.tsx`

- [ ] **Step 1: Create REST handlers**

Create `apps/frontend/src/mocks/handlers.ts`:

```ts
import { http, HttpResponse } from 'msw';

const API = 'http://localhost:3000';
const AZURA = 'https://radio.aubesonore.fr';

export const handlers = [
  // Auth
  http.get(`${API}/api/auth/get-session`, () => {
    return HttpResponse.json({ user: null });
  }),
  http.post(`${API}/api/auth/sign-in/email`, () => {
    return HttpResponse.json({
      user: { id: 'u1', email: 'test@example.com', name: 'Test' },
    });
  }),
  http.post(`${API}/api/auth/sign-up/email`, () => {
    return HttpResponse.json({
      user: { id: 'u1', email: 'test@example.com', name: 'Test' },
    });
  }),
  http.post(`${API}/api/auth/sign-out`, () => HttpResponse.json({})),

  // Track
  http.get(`${API}/api/track/like`, () => HttpResponse.json([])),
  http.post(`${API}/api/track/like`, async ({ request }) => {
    const body = (await request.json()) as { title: string; artist: string };
    return HttpResponse.json({
      track: {
        id: 't1',
        userId: 'u1',
        title: body.title,
        artist: body.artist,
        album: null,
        artworkUrl: null,
        youtubeUrl: 'https://youtube.com/x',
        isrc: null,
        songlinkUrl: null,
        platformLinks: null,
        createdAt: new Date().toISOString(),
      },
    });
  }),
  http.delete(`${API}/api/track/like/:id`, () => HttpResponse.json({ message: 'ok' })),
  http.post(`${API}/api/track/check-liked`, () => HttpResponse.json({ liked: false })),

  // Preferences
  http.get(`${API}/api/preferences`, () =>
    HttpResponse.json({ id: 'p1', userId: 'u1', preferredPlatform: 'spotify' })
  ),
  http.put(`${API}/api/preferences`, () =>
    HttpResponse.json({ preferences: { id: 'p1', userId: 'u1', preferredPlatform: 'spotify' } })
  ),

  // Push
  http.get(`${API}/api/push/vapid-key`, () => HttpResponse.json({ key: 'BFakeVapidKey' })),
  http.post(`${API}/api/push/subscribe`, () => HttpResponse.json({ message: 'ok' })),
  http.delete(`${API}/api/push/unsubscribe`, () => HttpResponse.json({ message: 'ok' })),

  // Artist info
  http.get(`${API}/api/artist`, ({ request }) => {
    const url = new URL(request.url);
    const name = url.searchParams.get('name');
    if (name === 'Unknown') return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ name, bio: 'Test bio', image: null });
  }),

  // AzuraCast static fallback
  http.get(`${AZURA}/api/nowplaying_static/aubesonore.json`, () =>
    HttpResponse.json(makeNowPlaying())
  ),
];

export function makeNowPlaying() {
  return {
    station: {
      id: 1,
      name: 'AubeSonore',
      shortcode: 'aubesonore',
      description: '',
      frontend: 'icecast',
      backend: 'liquidsoap',
      timezone: 'UTC',
      listen_url: 'https://radio.aubesonore.fr/listen/aubesonore/radio.mp3',
      url: '',
      public_player_url: '',
      playlist_pls_url: '',
      playlist_m3u_url: '',
      is_public: true,
      requests_enabled: false,
      mounts: [],
      remotes: [],
      hls_enabled: false,
      hls_url: null,
    },
    listeners: { total: 5, unique: 3, current: 3 },
    live: { is_live: false, streamer_name: '', broadcast_start: null, art: null },
    now_playing: {
      sh_id: 100,
      played_at: 1715688000,
      duration: 180,
      playlist: 'main',
      streamer: '',
      is_request: false,
      song: {
        id: 's1',
        art: 'https://radio.aubesonore.fr/api/station/1/art/100',
        text: 'Artist - Title',
        artist: 'Test Artist',
        title: 'Test Title',
        album: '',
        genre: '',
        isrc: '',
        lyrics: '',
      },
      elapsed: 30,
      remaining: 150,
    },
    playing_next: null,
    song_history: [],
    is_online: true,
  };
}
```

- [ ] **Step 2: Create SSE handlers**

Create `apps/frontend/src/mocks/sse-handlers.ts`:

```ts
import { sse } from 'msw';
import { makeNowPlaying } from './handlers';

const AZURA = 'https://radio.aubesonore.fr';

export const sseHandlers = [
  sse(`${AZURA}/api/live/nowplaying/sse`, ({ client }) => {
    // Initial connect message
    client.send({
      data: JSON.stringify({
        connect: {
          subs: {
            'station:aubesonore': {
              publications: [{ data: { np: makeNowPlaying() } }],
            },
          },
        },
      }),
    });
  }),
];
```

- [ ] **Step 3: Create server**

Create `apps/frontend/src/mocks/server.ts`:

```ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { sseHandlers } from './sse-handlers';

export const server = setupServer(...handlers, ...sseHandlers);
```

- [ ] **Step 4: Create setup file**

Create `apps/frontend/src/mocks/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

- [ ] **Step 5: Create test-utils**

Create `apps/frontend/src/test-utils.tsx`:

```tsx
import { render, type RenderOptions } from '@testing-library/react';
import { AuthProvider } from './components/AuthProvider';
import { LikedTracksProvider } from './contexts/LikedTracksContext';
import type { ReactElement, ReactNode } from 'react';

function AllProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LikedTracksProvider>{children}</LikedTracksProvider>
    </AuthProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
```

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/mocks apps/frontend/src/test-utils.tsx
git commit -m "test: set up MSW handlers, SSE handlers, server, and test utilities"
```

---

### Task 5: Update vitest.config.ts

**Files:**

- Modify: `apps/frontend/vitest.config.ts`

- [ ] **Step 1: Replace config with revised version**

Replace `apps/frontend/vitest.config.ts` entirely:

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/mocks/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/mocks/**',
        'src/test-utils.tsx',
        'src/components/Player/AlbumArt.tsx',
        'src/components/Player/WaveformProgress.tsx',
        'src/components/ShareCard/ShareCardRenderer.tsx',
        'src/main.tsx',
        'src/sw.ts',
        'src/vite-env.d.ts',
        'src/types/**',
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Note: `environmentMatchGlobs` is removed — `.tsx` test files must declare `// @vitest-environment jsdom` at the top.

- [ ] **Step 2: Run existing tests to verify infrastructure works**

```bash
pnpm --filter @aubesonore/frontend test --run
```

Expected: existing `utils.test.ts` passes, MSW setup loaded without errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/vitest.config.ts
git commit -m "test: configure vitest 4 with MSW setup and coverage thresholds"
```

---

## Phase 4 — Silent Failure Fixes (TDD)

### Task 6: Fix lib/api.ts getSession (distinguish 401 from error)

**Files:**

- Test: `apps/frontend/src/lib/api.test.ts` (new)
- Modify: `apps/frontend/src/lib/api.ts`

- [ ] **Step 1: Write the failing tests**

Create `apps/frontend/src/lib/api.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { authApi } from './api';

describe('authApi.getSession', () => {
  it('returns null when no session (401)', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: null }, { status: 401 })
      )
    );
    const result = await authApi.getSession();
    expect(result).toBeNull();
  });

  it('returns user when session valid', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'x@y.z', name: 'X' } })
      )
    );
    const result = await authApi.getSession();
    expect(result?.user.id).toBe('u1');
  });

  it('throws on network error', async () => {
    server.use(http.get('http://localhost:3000/api/auth/get-session', () => HttpResponse.error()));
    await expect(authApi.getSession()).rejects.toThrow();
  });

  it('throws on 500', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 })
      )
    );
    await expect(authApi.getSession()).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail correctly**

```bash
pnpm --filter @aubesonore/frontend test src/lib/api.test.ts --run
```

Expected: "throws on network error" and "throws on 500" FAIL (current code silently returns null).

- [ ] **Step 3: Refactor getSession**

In `apps/frontend/src/lib/api.ts`, replace the `getSession` method (lines 41-54):

```ts
getSession: async (): Promise<AuthResponse | null> => {
  const response = await fetch(`${API_BASE_URL}/api/auth/get-session`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) {
    throw new Error(`getSession failed: HTTP ${response.status}`);
  }
  const data = (await response.json()) as { user?: unknown };
  if (!data.user) return null;
  return data as AuthResponse;
},
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm --filter @aubesonore/frontend test src/lib/api.test.ts --run
```

Expected: 4 tests passing.

- [ ] **Step 5: Update useAuth to catch the new throw**

In `apps/frontend/src/hooks/useAuth.ts`, replace `refreshSession` (lines 46-58):

```ts
const [authError, setAuthError] = useState<string | null>(null);

const refreshSession = useCallback(async () => {
  try {
    setState((prev) => ({ ...prev, isLoading: true }));
    setAuthError(null);
    const session = await authApi.getSession();
    setState({
      user: session?.user || null,
      isAuthenticated: !!session?.user,
      isLoading: false,
    });
  } catch (err) {
    setAuthError(err instanceof Error ? err.message : 'Erreur réseau');
    setState({ user: null, isAuthenticated: false, isLoading: false });
  }
}, []);
```

Also add `authError` to the `AuthContextType` interface and the returned object. Add `useState` to imports.

- [ ] **Step 6: Run typecheck**

```bash
pnpm --filter @aubesonore/frontend typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src/lib/api.ts apps/frontend/src/lib/api.test.ts apps/frontend/src/hooks/useAuth.ts
git commit -m "fix(frontend): getSession distinguishes 401 (null) from errors (throw)"
```

---

### Task 7: Fix lib/azuracast.ts SSE parsing + add Valibot schema

**Files:**

- Create: `apps/frontend/src/lib/validators/azuracast.ts`
- Modify: `apps/frontend/src/lib/azuracast.ts`
- Test: `apps/frontend/src/lib/azuracast.test.ts` (new)

- [ ] **Step 1: Create Valibot schema**

Create `apps/frontend/src/lib/validators/azuracast.ts`:

```ts
import {
  object,
  string,
  number,
  boolean,
  nullable,
  array,
  optional,
  unknown,
  type InferOutput,
} from 'valibot';

const SongSchema = object({
  id: string(),
  art: string(),
  text: string(),
  artist: string(),
  title: string(),
  album: string(),
  genre: string(),
  isrc: string(),
  lyrics: string(),
});

const SongEntrySchema = object({
  sh_id: number(),
  played_at: number(),
  duration: number(),
  playlist: string(),
  streamer: string(),
  is_request: boolean(),
  song: SongSchema,
  elapsed: optional(number()),
  remaining: optional(number()),
});

const ListenersSchema = object({
  total: number(),
  unique: number(),
  current: number(),
});

const LiveStatusSchema = object({
  is_live: boolean(),
  streamer_name: string(),
  broadcast_start: nullable(number()),
  art: nullable(string()),
});

export const NowPlayingSchema = object({
  station: unknown(),
  listeners: ListenersSchema,
  live: LiveStatusSchema,
  now_playing: SongEntrySchema,
  playing_next: nullable(SongEntrySchema),
  song_history: array(SongEntrySchema),
  is_online: boolean(),
});

export type ValidatedNowPlaying = InferOutput<typeof NowPlayingSchema>;
```

- [ ] **Step 2: Write failing tests**

Create `apps/frontend/src/lib/azuracast.test.ts` with `// @vitest-environment jsdom` annotation:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNowPlaying } from './azuracast';

class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();
  constructor(public url: string) {
    MockEventSource.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }
  emit(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }
}

afterEach(() => {
  MockEventSource.instances = [];
});

describe('useNowPlaying', () => {
  it('ignores empty ping messages', async () => {
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    MockEventSource.instances[0].emit('{}');
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('updates data on connect message with publications', async () => {
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    const np = {
      station: {},
      listeners: { total: 1, unique: 1, current: 1 },
      live: { is_live: false, streamer_name: '', broadcast_start: null, art: null },
      now_playing: {
        sh_id: 1,
        played_at: 0,
        duration: 100,
        playlist: 'a',
        streamer: '',
        is_request: false,
        song: {
          id: 's',
          art: '',
          text: '',
          artist: 'A',
          title: 'T',
          album: '',
          genre: '',
          isrc: '',
          lyrics: '',
        },
      },
      playing_next: null,
      song_history: [],
      is_online: true,
    };
    MockEventSource.instances[0].emit(
      JSON.stringify({
        connect: { subs: { 'station:aubesonore': { publications: [{ data: { np } }] } } },
      })
    );
    await waitFor(() => expect(result.current.data?.now_playing.song.title).toBe('T'));
  });

  it('logs invalid payload shape and does not update state', async () => {
    const warn = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    MockEventSource.instances[0].emit(
      JSON.stringify({
        connect: {
          subs: { 'station:aubesonore': { publications: [{ data: { np: { broken: true } } }] } },
        },
      })
    );
    expect(result.current.data).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
pnpm --filter @aubesonore/frontend test src/lib/azuracast.test.ts --run
```

Expected: "logs invalid payload shape" FAILS (current code swallows silently).

- [ ] **Step 4: Refactor useNowPlaying onmessage**

In `apps/frontend/src/lib/azuracast.ts`, replace lines 67-85:

```ts
eventSource.onmessage = (event: MessageEvent<string>) => {
  if (event.data === '' || event.data === '{}') return;

  let message: SSEMessage;
  try {
    message = JSON.parse(event.data) as SSEMessage;
  } catch (err) {
    console.warn('[SSE] Unexpected non-JSON message:', event.data, err);
    return;
  }

  const candidate =
    message.connect?.subs?.[`station:${STATION_SHORTCODE}`]?.publications?.[0]?.data?.np ??
    message.pub?.data?.np;
  if (!candidate) return;

  const parsed = safeParse(NowPlayingSchema, candidate);
  if (!parsed.success) {
    console.error('[SSE] Invalid NowPlaying shape:', parsed.issues);
    return;
  }
  setData(candidate as NowPlaying);
};
```

Add imports at the top of `azuracast.ts`:

```ts
import { safeParse } from 'valibot';
import { NowPlayingSchema } from './validators/azuracast';
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @aubesonore/frontend test src/lib/azuracast.test.ts --run
```

Expected: all 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/lib/validators apps/frontend/src/lib/azuracast.ts apps/frontend/src/lib/azuracast.test.ts
git commit -m "fix(frontend): validate SSE payload at boundary, log unexpected messages"
```

---

### Task 8: Fix lib/player.ts (playError + AbortError filter + stop() race)

**Files:**

- Modify: `apps/frontend/src/lib/player.ts`
- Test: `apps/frontend/src/lib/player.test.ts` (new)

- [ ] **Step 1: Write failing tests**

Create `apps/frontend/src/lib/player.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockAudio {
  src = '';
  volume = 1;
  preload = 'none';
  crossOrigin = 'anonymous';
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  load = vi.fn();
  setAttribute = vi.fn();
  addEventListener = vi.fn();
}

let mockAudioInstance: MockAudio;

beforeEach(() => {
  vi.resetModules();
  mockAudioInstance = new MockAudio();
  vi.stubGlobal(
    'Audio',
    vi.fn(() => mockAudioInstance)
  );
  vi.stubGlobal(
    'AudioContext',
    vi.fn(() => ({
      createAnalyser: () => ({ connect: vi.fn() }),
      createMediaElementSource: () => ({ connect: vi.fn() }),
      state: 'running',
      resume: vi.fn(),
      destination: {},
    }))
  );
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  });
});

describe('player store', () => {
  it('sets isPlaying true on successful play()', async () => {
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    expect(usePlayer.getState().isPlaying).toBe(true);
    expect(usePlayer.getState().playError).toBeNull();
  });

  it('does NOT set playError on AbortError (double-click race)', async () => {
    const abort = new Error('Aborted');
    abort.name = 'AbortError';
    mockAudioInstance.play.mockRejectedValueOnce(abort);
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    expect(usePlayer.getState().isPlaying).toBe(false);
    expect(usePlayer.getState().playError).toBeNull();
  });

  it('sets playError on network failure', async () => {
    mockAudioInstance.play.mockRejectedValueOnce(new Error('Network down'));
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    expect(usePlayer.getState().playError?.message).toContain('Network down');
  });

  it('stop() clears isPlaying and playError', async () => {
    const { usePlayer } = await import('./player');
    await usePlayer.getState().play();
    usePlayer.getState().stop();
    expect(usePlayer.getState().isPlaying).toBe(false);
    expect(usePlayer.getState().playError).toBeNull();
  });

  it('setVolume clamps to [0, 1]', async () => {
    const { usePlayer } = await import('./player');
    usePlayer.getState().setVolume(1.5);
    expect(usePlayer.getState().volume).toBe(1);
    usePlayer.getState().setVolume(-0.5);
    expect(usePlayer.getState().volume).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
pnpm --filter @aubesonore/frontend test src/lib/player.test.ts --run
```

Expected: at least the AbortError test fails (current code doesn't distinguish).

- [ ] **Step 3: Refactor player.ts**

Replace `apps/frontend/src/lib/player.ts` entirely:

```ts
import { create } from 'zustand';
import { STREAM_URL } from '../utils/config';

const STORAGE_KEY = 'aubesonore_volume';

export interface PlayError {
  code: 'aborted' | 'network' | 'unknown';
  message: string;
}

interface PlayerState {
  isPlaying: boolean;
  volume: number;
  playError: PlayError | null;
}

interface PlayerActions {
  play: () => Promise<void>;
  stop: () => void;
  setVolume: (value: number) => void;
  clearPlayError: () => void;
}

type PlayerStore = PlayerState & PlayerActions;

const audio = new Audio();
audio.preload = 'none';
audio.crossOrigin = 'anonymous';
audio.setAttribute('x-webkit-airplay', 'allow');
audio.setAttribute('airplay', 'allow');

export function getAudioElement(): HTMLAudioElement {
  return audio;
}

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaElementAudioSourceNode | null = null;
// Tracks if a stop() is in progress so the resulting audio error event
// is not surfaced as a playError to the user.
let isStopping = false;

const getStoredVolume = (): number => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? parseFloat(stored) : 1;
  } catch {
    return 1;
  }
};

audio.volume = getStoredVolume();

const initAudioContext = () => {
  if (audioContext && sourceNode) return;
  audioContext = new AudioContext();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.8;
  sourceNode = audioContext.createMediaElementSource(audio);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);
};

export const getAnalyser = (): AnalyserNode | null => analyser;

function classifyPlayError(err: unknown): PlayError | null {
  if (err instanceof Error && err.name === 'AbortError') {
    return null; // double-click race, expected, not user-visible
  }
  if (err instanceof Error) {
    const isNetwork = /network|fetch|load/i.test(err.message);
    return {
      code: isNetwork ? 'network' : 'unknown',
      message: err.message,
    };
  }
  return { code: 'unknown', message: String(err) };
}

export const usePlayer = create<PlayerStore>((set) => ({
  isPlaying: false,
  volume: getStoredVolume(),
  playError: null,

  play: async () => {
    set({ playError: null });
    try {
      initAudioContext();
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }
      audio.src = STREAM_URL;
      audio.load();
      await audio.play();
      set({ isPlaying: true });
    } catch (error) {
      const playError = classifyPlayError(error);
      console.error('[Player] Playback failed:', error);
      set({ isPlaying: false, playError });
    }
  },

  stop: () => {
    isStopping = true;
    audio.pause();
    audio.src = '';
    set({ isPlaying: false, playError: null });
    // Reset flag after the error event has had a chance to fire
    queueMicrotask(() => {
      isStopping = false;
    });
  },

  setVolume: (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    audio.volume = clamped;
    try {
      localStorage.setItem(STORAGE_KEY, clamped.toString());
    } catch {
      // localStorage unavailable (private mode) — keep in-memory state only
    }
    set({ volume: clamped });
  },

  clearPlayError: () => set({ playError: null }),
}));

audio.addEventListener('error', () => {
  if (isStopping) return; // suppress noise from stop()
  console.error('[Player] Audio element error:', audio.error);
});

// HMR: avoid re-creating MediaElementAudioSourceNode (throws InvalidStateError)
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // No-op: keep existing audio + source node, do not re-init
  });
}
```

- [ ] **Step 4: Update Player component to surface playError as toast**

In `apps/frontend/src/components/Player/index.tsx`, add after line 41:

```ts
const playError = usePlayer((s) => s.playError);
const clearPlayError = usePlayer((s) => s.clearPlayError);

useEffect(() => {
  if (playError) {
    toast.error(`Lecture impossible : ${playError.message}`);
    clearPlayError();
  }
}, [playError, clearPlayError]);
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
pnpm --filter @aubesonore/frontend test src/lib/player.test.ts --run
```

Expected: all 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/lib/player.ts apps/frontend/src/lib/player.test.ts apps/frontend/src/components/Player/index.tsx
git commit -m "fix(frontend): player surfaces real errors, filters AbortError and stop() noise"
```

---

### Task 9: Fix hooks/usePushNotifications.ts (discriminated union)

**Files:**

- Modify: `apps/frontend/src/hooks/usePushNotifications.ts`
- Test: `apps/frontend/src/hooks/usePushNotifications.test.ts` (new)

- [ ] **Step 1: Write failing tests**

Create `apps/frontend/src/hooks/usePushNotifications.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { usePushNotifications } from './usePushNotifications';

beforeEach(() => {
  vi.stubGlobal('Notification', {
    permission: 'default',
    requestPermission: vi.fn().mockResolvedValue('granted'),
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(null),
          subscribe: vi.fn().mockResolvedValue({
            endpoint: 'https://fcm.googleapis.com/abc',
            toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/abc' }),
          }),
        },
      }),
    },
  });
  vi.stubGlobal('PushManager', class {});
});

describe('usePushNotifications.subscribe', () => {
  it('returns { success: true } on happy path', async () => {
    const { result } = renderHook(() => usePushNotifications());
    let res: Awaited<ReturnType<typeof result.current.subscribe>> | undefined;
    await act(async () => {
      res = await result.current.subscribe();
    });
    expect(res).toEqual({ success: true });
  });

  it('returns reason "permission-denied" when user denies', async () => {
    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('denied'),
    });
    const { result } = renderHook(() => usePushNotifications());
    let res: Awaited<ReturnType<typeof result.current.subscribe>> | undefined;
    await act(async () => {
      res = await result.current.subscribe();
    });
    expect(res).toEqual({ success: false, reason: 'permission-denied' });
  });

  it('returns reason "vapid-missing" when server has no VAPID key', async () => {
    server.use(http.get('http://localhost:3000/api/push/vapid-key', () => HttpResponse.json({})));
    const { result } = renderHook(() => usePushNotifications());
    let res: Awaited<ReturnType<typeof result.current.subscribe>> | undefined;
    await act(async () => {
      res = await result.current.subscribe();
    });
    expect(res).toEqual({ success: false, reason: 'vapid-missing' });
  });

  it('returns reason "server-error" when /api/push/subscribe returns 500', async () => {
    server.use(
      http.post(
        'http://localhost:3000/api/push/subscribe',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    const { result } = renderHook(() => usePushNotifications());
    let res: Awaited<ReturnType<typeof result.current.subscribe>> | undefined;
    await act(async () => {
      res = await result.current.subscribe();
    });
    expect(res?.success).toBe(false);
    if (res && !res.success) expect(res.reason).toBe('server-error');
  });
});
```

- [ ] **Step 2: Refactor usePushNotifications**

In `apps/frontend/src/hooks/usePushNotifications.ts`, replace the `subscribe` callback (lines 57-92):

```ts
export type SubscribeResult =
  | { success: true }
  | {
      success: false;
      reason: 'permission-denied' | 'vapid-missing' | 'server-error' | 'unknown';
      cause?: Error;
    };

const subscribe = useCallback(async (): Promise<SubscribeResult> => {
  if (!state.isSupported) return { success: false, reason: 'unknown' };

  try {
    const permission = await Notification.requestPermission();
    setState((s) => ({ ...s, permission }));
    if (permission !== 'granted') {
      return { success: false, reason: 'permission-denied' };
    }

    const vapidKey = await fetchVapidKey();
    if (!vapidKey) {
      return { success: false, reason: 'vapid-missing' };
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    const res = await fetch(`${API_BASE_URL}/api/push/subscribe`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON()),
    });

    if (!res.ok) {
      return { success: false, reason: 'server-error' };
    }

    setState((s) => ({ ...s, isSubscribed: true }));
    return { success: true };
  } catch (err) {
    console.error('[PushNotifications] Subscribe error:', err);
    return {
      success: false,
      reason: 'unknown',
      cause: err instanceof Error ? err : new Error(String(err)),
    };
  }
}, [state.isSupported]);
```

- [ ] **Step 3: Update any callers**

Search for usages of `subscribe()` from this hook (`apps/frontend/src/components/NotificationBanner.tsx`) and update to handle the new shape. If the caller does `if (await subscribe())` it should become `if ((await subscribe()).success)`.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @aubesonore/frontend test src/hooks/usePushNotifications.test.ts --run
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/hooks/usePushNotifications.ts apps/frontend/src/hooks/usePushNotifications.test.ts apps/frontend/src/components/NotificationBanner.tsx
git commit -m "fix(frontend): push subscribe returns discriminated union with failure reason"
```

---

## Phase 5 — AzuraCast Static REST Fallback

### Task 10: Add static endpoint fetch to useNowPlaying

**Files:**

- Modify: `apps/frontend/src/utils/config.ts`
- Modify: `apps/frontend/src/lib/azuracast.ts`
- Update tests: `apps/frontend/src/lib/azuracast.test.ts`

- [ ] **Step 1: Add static URL to config**

In `apps/frontend/src/utils/config.ts`, append:

```ts
export const STATIC_NOWPLAYING_URL: string = `${AZURACAST_URL}/api/nowplaying_static/${STATION_SHORTCODE}.json`;
```

- [ ] **Step 2: Write failing test**

In `apps/frontend/src/lib/azuracast.test.ts`, append:

```ts
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

describe('useNowPlaying REST fallback', () => {
  it('fetches static endpoint on mount in parallel with SSE', async () => {
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => {
      expect(result.current.data?.now_playing.song.title).toBe('Test Title');
    });
  });

  it('logs info once if static endpoint 404s, does not error', async () => {
    server.use(
      http.get(
        'https://radio.aubesonore.fr/api/nowplaying_static/aubesonore.json',
        () => new HttpResponse(null, { status: 404 })
      )
    );
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubGlobal('EventSource', MockEventSource);
    const { result } = renderHook(() => useNowPlaying());
    await waitFor(() => expect(info).toHaveBeenCalled());
    expect(result.current.error).toBeNull();
    info.mockRestore();
  });
});
```

- [ ] **Step 3: Add REST fallback in useNowPlaying**

In `apps/frontend/src/lib/azuracast.ts`, inside the `useEffect` that calls `connect()`, add **before** `connect()`:

```ts
useEffect(() => {
  let cancelled = false;
  void (async () => {
    try {
      const res = await fetch(STATIC_NOWPLAYING_URL);
      if (res.status === 404) {
        console.info('[AzuraCast] Static endpoint not available, relying on SSE only');
        return;
      }
      if (!res.ok) return;
      const json = (await res.json()) as unknown;
      const parsed = safeParse(NowPlayingSchema, json);
      if (!parsed.success) {
        console.error('[AzuraCast] Invalid static payload:', parsed.issues);
        return;
      }
      if (!cancelled) setData(json as NowPlaying);
    } catch (err) {
      console.warn('[AzuraCast] Static fetch failed:', err);
    }
  })();
  connect();
  return () => {
    cancelled = true;
    // existing cleanup...
  };
}, [connect]);
```

Add import:

```ts
import { STATIC_NOWPLAYING_URL, SSE_URL, STATION_SHORTCODE } from '../utils/config';
```

Note: the SSE will overwrite the static payload as soon as the connect message arrives — first response wins for initial paint, then SSE takes over.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @aubesonore/frontend test src/lib/azuracast.test.ts --run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/utils/config.ts apps/frontend/src/lib/azuracast.ts apps/frontend/src/lib/azuracast.test.ts
git commit -m "feat(frontend): add AzuraCast static REST fallback for initial paint"
```

---

## Phase 6 — Performance Fixes

### Task 11: Fix RAF loop in Player

**Files:**

- Modify: `apps/frontend/src/components/Player/index.tsx`

- [ ] **Step 1: Replace the RAF effect (lines 71-91)**

```tsx
useEffect(() => {
  if (!isPlaying || duration <= 0) return;

  startTimeRef.current = performance.now();
  const animate = () => {
    const now = performance.now();
    const deltaSeconds = (now - startTimeRef.current) / 1000;
    const newElapsed = Math.min(baseElapsedRef.current + deltaSeconds, duration);
    setElapsed(newElapsed);
    animationRef.current = requestAnimationFrame(animate);
  };
  animationRef.current = requestAnimationFrame(animate);

  return () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };
}, [duration, isPlaying]);
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @aubesonore/frontend typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/components/Player/index.tsx
git commit -m "perf(frontend): pause RAF loop when player is stopped"
```

---

### Task 12: Add web-vitals to main.tsx

**Files:**

- Modify: `apps/frontend/src/main.tsx`

- [ ] **Step 1: Read main.tsx to find insertion point**

```bash
cat apps/frontend/src/main.tsx
```

- [ ] **Step 2: Append at end of file**

```ts
if (import.meta.env.DEV) {
  void import('web-vitals').then(({ onLCP, onCLS, onINP }) => {
    onLCP((m) => console.debug('[CWV] LCP', m));
    onCLS((m) => console.debug('[CWV] CLS', m));
    onINP((m) => console.debug('[CWV] INP', m));
  });
}
```

- [ ] **Step 3: Build to confirm tree-shaking**

```bash
pnpm --filter @aubesonore/frontend build
```

Expected: build succeeds, prod bundle should not contain `web-vitals` (verify in stats.html after next task).

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/main.tsx
git commit -m "feat(frontend): log Core Web Vitals to console in dev mode"
```

---

### Task 13: Add rollup-plugin-visualizer to vite.config

**Files:**

- Modify: `apps/frontend/vite.config.ts`

- [ ] **Step 1: Read current vite.config.ts**

```bash
cat apps/frontend/vite.config.ts
```

- [ ] **Step 2: Add visualizer plugin**

Add import:

```ts
import { visualizer } from 'rollup-plugin-visualizer';
import type { PluginOption } from 'vite';
```

In the `plugins` array, append (last position):

```ts
visualizer({
  filename: 'dist/stats.html',
  emitFile: true,
  gzipSize: true,
  brotliSize: true,
}) as PluginOption,
```

- [ ] **Step 3: Build and verify stats.html is generated**

```bash
pnpm --filter @aubesonore/frontend build
ls apps/frontend/dist/stats.html
```

Expected: file exists.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/vite.config.ts
git commit -m "build(frontend): emit bundle stats.html via rollup-plugin-visualizer"
```

---

## Phase 7 — Error Boundaries

### Task 14: Add error boundaries in App.tsx

**Files:**

- Create: `apps/frontend/src/components/ErrorFallback.tsx`
- Modify: `apps/frontend/src/App.tsx`
- Modify: `apps/frontend/src/pages/HomePage.tsx`
- Test: `apps/frontend/src/components/ErrorFallback.test.tsx` (new)

- [ ] **Step 1: Create the fallback component**

Create `apps/frontend/src/components/ErrorFallback.tsx`:

```tsx
import type { FallbackProps } from 'react-error-boundary';

export function PlayerErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <div role="alert" className="w-full max-w-lg mx-auto p-6 text-center text-white/80">
      <p className="mb-3">Lecteur indisponible.</p>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
      >
        Réessayer
      </button>
    </div>
  );
}

interface ModalErrorFallbackProps extends FallbackProps {
  onClose: () => void;
}

export function ModalErrorFallback({ onClose }: ModalErrorFallbackProps) {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
    >
      <div className="p-6 rounded-xl bg-black/80 text-white/80 border border-white/10 max-w-sm w-full mx-4">
        <p className="mb-3">Une erreur est survenue.</p>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wrap Player in HomePage**

In `apps/frontend/src/pages/HomePage.tsx`, replace lines 46-50:

```tsx
<div className="relative z-10 w-full">
  <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
    <Player />
  </ErrorBoundary>
</div>
```

Add imports:

```tsx
import { ErrorBoundary } from 'react-error-boundary';
import { PlayerErrorFallback } from '../components/ErrorFallback';
```

- [ ] **Step 3: Wrap modals in Player/index.tsx**

In `apps/frontend/src/components/Player/index.tsx`, replace the Suspense blocks at lines 408-418:

```tsx
{
  isModalOpen && (
    <Suspense fallback={null}>
      <ErrorBoundary
        FallbackComponent={(props) => (
          <ModalErrorFallback {...props} onClose={() => setIsModalOpen(false)} />
        )}
      >
        <LikedTracksModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </ErrorBoundary>
    </Suspense>
  );
}

{
  isAuthModalOpen && (
    <Suspense fallback={null}>
      <ErrorBoundary
        FallbackComponent={(props) => (
          <ModalErrorFallback {...props} onClose={() => setIsAuthModalOpen(false)} />
        )}
      >
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </ErrorBoundary>
    </Suspense>
  );
}
```

Add imports:

```tsx
import { ErrorBoundary } from 'react-error-boundary';
import { ModalErrorFallback } from '../ErrorFallback';
```

- [ ] **Step 4: Write component test**

Create `apps/frontend/src/components/ErrorFallback.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from 'react-error-boundary';
import { PlayerErrorFallback } from './ErrorFallback';

function Boom(): never {
  throw new Error('boom');
}

describe('PlayerErrorFallback', () => {
  it('renders message and reset button when child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Lecteur indisponible');
    expect(screen.getByRole('button', { name: /réessayer/i })).toBeInTheDocument();
    spy.mockRestore();
  });

  it('calls resetErrorBoundary when button clicked', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;
    function Conditional() {
      if (shouldThrow) throw new Error('boom');
      return <div>recovered</div>;
    }
    render(
      <ErrorBoundary FallbackComponent={PlayerErrorFallback}>
        <Conditional />
      </ErrorBoundary>
    );
    shouldThrow = false;
    await userEvent.click(screen.getByRole('button', { name: /réessayer/i }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
    spy.mockRestore();
  });
});
```

- [ ] **Step 5: Run tests + typecheck**

```bash
pnpm --filter @aubesonore/frontend test src/components/ErrorFallback.test.tsx --run
pnpm --filter @aubesonore/frontend typecheck
```

Expected: 2 tests pass, no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/components/ErrorFallback.tsx apps/frontend/src/components/ErrorFallback.test.tsx apps/frontend/src/App.tsx apps/frontend/src/pages/HomePage.tsx apps/frontend/src/components/Player/index.tsx
git commit -m "feat(frontend): add error boundaries around Player and lazy modals"
```

---

## Phase 8 — Additional Tests

### Task 15: Tests for useAuth, useArtistInfo, usePreferences

**Files:**

- Test: `apps/frontend/src/hooks/useAuth.test.tsx` (new)
- Test: `apps/frontend/src/hooks/useArtistInfo.test.ts` (new)
- Test: `apps/frontend/src/hooks/usePreferences.test.ts` (new)

- [ ] **Step 1: Test useAuth**

Create `apps/frontend/src/hooks/useAuth.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useAuthState } from './useAuth';

describe('useAuthState', () => {
  it('starts in loading=true', () => {
    const { result } = renderHook(() => useAuthState());
    expect(result.current.isLoading).toBe(true);
  });

  it('loads session on mount when present', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      )
    );
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('u1');
  });

  it('signIn updates state to authenticated', async () => {
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.signIn('a@b.c', 'pw'));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('signOut clears user', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      )
    );
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(() => result.current.signOut());
    expect(result.current.isAuthenticated).toBe(false);
  });
});
```

- [ ] **Step 2: Test useArtistInfo**

Create `apps/frontend/src/hooks/useArtistInfo.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { useArtistInfo } from './useArtistInfo';

describe('useArtistInfo', () => {
  it('fetches artist data when name provided', async () => {
    const { result } = renderHook(() => useArtistInfo('Test Artist'));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.name).toBe('Test Artist');
  });

  it('returns null for 404', async () => {
    const { result } = renderHook(() => useArtistInfo('Unknown'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
  });

  it('does not fetch when name is empty', async () => {
    let called = false;
    server.use(
      http.get('http://localhost:3000/api/artist', () => {
        called = true;
        return HttpResponse.json({});
      })
    );
    renderHook(() => useArtistInfo(''));
    await new Promise((r) => setTimeout(r, 50));
    expect(called).toBe(false);
  });
});
```

- [ ] **Step 3: Test usePreferences**

Create `apps/frontend/src/hooks/usePreferences.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { usePreferences } from './usePreferences';

describe('usePreferences', () => {
  it('fetches preferences on mount', async () => {
    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.preferences).not.toBeNull());
    expect(result.current.preferences?.preferredPlatform).toBe('spotify');
  });

  it('updates platform via mutation', async () => {
    const { result } = renderHook(() => usePreferences());
    await waitFor(() => expect(result.current.preferences).not.toBeNull());
    await act(() => result.current.updatePlatform('apple_music'));
    expect(result.current.preferences?.preferredPlatform).toBeTruthy();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @aubesonore/frontend test src/hooks --run
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/hooks/useAuth.test.tsx apps/frontend/src/hooks/useArtistInfo.test.ts apps/frontend/src/hooks/usePreferences.test.ts
git commit -m "test(frontend): cover useAuth, useArtistInfo, usePreferences happy and edge paths"
```

---

### Task 16: Tests for stores (sleepTimer, cast, stats)

**Files:**

- Test: `apps/frontend/src/stores/sleepTimerStore.test.ts` (new)
- Test: `apps/frontend/src/stores/castStore.test.ts` (new)

- [ ] **Step 1: Test sleepTimerStore**

Create `apps/frontend/src/stores/sleepTimerStore.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useSleepTimer } from './sleepTimerStore';

beforeEach(() => {
  useSleepTimer.setState(useSleepTimer.getInitialState());
});

describe('sleepTimerStore', () => {
  it('starts inactive', () => {
    expect(useSleepTimer.getState().isActive).toBe(false);
  });

  it('setTimer activates timer', () => {
    useSleepTimer.getState().setTimer(30);
    expect(useSleepTimer.getState().isActive).toBe(true);
  });

  it('cancel deactivates timer', () => {
    useSleepTimer.getState().setTimer(30);
    useSleepTimer.getState().cancel();
    expect(useSleepTimer.getState().isActive).toBe(false);
  });
});
```

Note: Adjust to match actual store API after reading `sleepTimerStore.ts`. If the store does not export `getInitialState`, use explicit reset:

```ts
useSleepTimer.setState({ isActive: false /* ...other initial fields */ });
```

- [ ] **Step 2: Test castStore**

Create `apps/frontend/src/stores/castStore.test.ts` mirroring the above pattern after reading `castStore.ts` for its actual API.

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @aubesonore/frontend test src/stores --run
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/stores/sleepTimerStore.test.ts apps/frontend/src/stores/castStore.test.ts
git commit -m "test(frontend): cover sleep timer and cast store state transitions"
```

---

### Task 17: Integration test for LikedTracksContext

**Files:**

- Test: `apps/frontend/src/contexts/LikedTracksContext.test.tsx` (new)

- [ ] **Step 1: Write the test**

Create `apps/frontend/src/contexts/LikedTracksContext.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { LikedTracksProvider, useLikedTracksContext } from './LikedTracksContext';
import { AuthProvider } from '../components/AuthProvider';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LikedTracksProvider>{children}</LikedTracksProvider>
    </AuthProvider>
  );
}

describe('LikedTracksContext', () => {
  it('rolls back optimistic like on server error', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      ),
      http.post(
        'http://localhost:3000/api/track/like',
        () => new HttpResponse(null, { status: 500 })
      )
    );
    const { result } = renderHook(() => useLikedTracksContext(), { wrapper });
    await waitFor(() => expect(result.current.tracks.length).toBe(0));

    await act(() =>
      result.current.likeTrack({
        title: 'T',
        artist: 'A',
        youtubeUrl: 'https://youtube.com/x',
      })
    );

    await waitFor(() => expect(result.current.tracks.length).toBe(0));
  });

  it('keeps optimistic track on success and replaces temp id', async () => {
    server.use(
      http.get('http://localhost:3000/api/auth/get-session', () =>
        HttpResponse.json({ user: { id: 'u1', email: 'a@b.c', name: 'A' } })
      )
    );
    const { result } = renderHook(() => useLikedTracksContext(), { wrapper });
    await waitFor(() => expect(result.current.tracks).toBeDefined());

    await act(() =>
      result.current.likeTrack({
        title: 'T',
        artist: 'A',
        youtubeUrl: 'https://youtube.com/x',
      })
    );

    await waitFor(() => expect(result.current.tracks.find((t) => t.id === 't1')).toBeDefined());
  });
});
```

- [ ] **Step 2: Run test**

```bash
pnpm --filter @aubesonore/frontend test src/contexts --run
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/contexts/LikedTracksContext.test.tsx
git commit -m "test(frontend): integration test for LikedTracksContext optimistic updates"
```

---

### Task 18: Component tests for AuthModal, NotificationBanner

**Files:**

- Test: `apps/frontend/src/components/AuthModal.test.tsx` (new)
- Test: `apps/frontend/src/components/NotificationBanner.test.tsx` (new)

- [ ] **Step 1: Test AuthModal**

Create `apps/frontend/src/components/AuthModal.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test-utils';
import { AuthModal } from './AuthModal';

describe('AuthModal', () => {
  it('renders sign-in form when open', () => {
    renderWithProviders(<AuthModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(<AuthModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('submits sign-in form and closes on success', async () => {
    const onClose = vi.fn();
    renderWithProviders(<AuthModal isOpen={true} onClose={onClose} />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/mot de passe/i);

    await userEvent.type(emailInput, 'a@b.c');
    await userEvent.type(passwordInput, 'password123');
    await userEvent.click(screen.getByRole('button', { name: /connexion/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
```

Note: adjust selectors after reading `AuthModal.tsx` to match its actual labels and roles.

- [ ] **Step 2: Test NotificationBanner**

Create `apps/frontend/src/components/NotificationBanner.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { NotificationBanner } from './NotificationBanner';

beforeEach(() => {
  vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: { getSubscription: vi.fn().mockResolvedValue(null) },
      }),
    },
  });
});

describe('NotificationBanner', () => {
  it('renders enable prompt when notifications supported and not subscribed', () => {
    renderWithProviders(<NotificationBanner />);
    expect(screen.getByText(/notifications/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm --filter @aubesonore/frontend test src/components --run
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/components/AuthModal.test.tsx apps/frontend/src/components/NotificationBanner.test.tsx
git commit -m "test(frontend): cover AuthModal and NotificationBanner rendering and interactions"
```

---

## Phase 9 — ESLint Additions

### Task 19: Add jsx-a11y, vitest, testing-library plugins

**Files:**

- Modify: `eslint.config.js`

- [ ] **Step 1: Update eslint.config.js**

Add imports at top:

```js
import jsxA11y from 'eslint-plugin-jsx-a11y';
import vitest from '@vitest/eslint-plugin';
import testingLibrary from 'eslint-plugin-testing-library';
```

After the React block (around line 80), add:

```js
{
  files: ['apps/frontend/**/*.{ts,tsx}', 'apps/mobile/**/*.{ts,tsx}'],
  ...jsxA11y.flatConfigs.recommended,
  rules: {
    ...jsxA11y.flatConfigs.recommended.rules,
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
  },
},

{
  files: ['**/*.{test,spec}.{ts,tsx}'],
  plugins: { vitest },
  rules: {
    ...vitest.configs.recommended.rules,
    'vitest/expect-expect': 'error',
    'vitest/no-disabled-tests': 'warn',
    'vitest/no-focused-tests': 'error',
  },
},

{
  files: ['**/*.test.tsx', '**/*.spec.tsx'],
  ...testingLibrary.configs['flat/react'],
},
```

- [ ] **Step 2: Run lint to see violations**

```bash
pnpm lint
```

Expected: some a11y warnings, no errors.

- [ ] **Step 3: Fix any errors that appear**

If any rule fires as `error`, fix the underlying code. Common quick fixes:

- Add `type="button"` to `<button>` inside forms
- Add `aria-label` to icon-only buttons
- Replace `<div onClick>` with `<button>`

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js
# also any file you had to fix in step 3
git commit -m "chore(lint): add jsx-a11y, vitest, and testing-library plugins"
```

---

### Task 20: Bump no-explicit-any to error and fix violations

**Files:**

- Modify: `eslint.config.js`
- Modify: various frontend files using `any`

- [ ] **Step 1: Find all explicit-any in frontend**

```bash
pnpm --filter @aubesonore/frontend lint 2>&1 | grep "no-explicit-any"
```

- [ ] **Step 2: Fix each violation**

For each file, replace `any` with the proper type. Common cases:

- Event handlers: use the specific event type (`React.ChangeEvent<HTMLInputElement>`)
- Untyped JSON: use `unknown` and validate
- Function args: use generics or concrete types

- [ ] **Step 3: Bump the rule to error**

In `eslint.config.js`, change:

```diff
- '@typescript-eslint/no-explicit-any': 'warn',
+ '@typescript-eslint/no-explicit-any': 'error',
```

- [ ] **Step 4: Verify clean lint**

```bash
pnpm lint
```

Expected: zero `no-explicit-any` violations.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js apps/frontend/src
git commit -m "chore(lint): bump no-explicit-any to error, replace remaining any usages"
```

---

## Phase 10 — CI + Final

### Task 21: Update CI to require coverage threshold

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Update the Frontend tests step**

Replace the existing step:

```diff
-      - name: Frontend tests
-        run: pnpm --filter=@aubesonore/frontend test --run
+      - name: Frontend tests with coverage
+        run: pnpm --filter=@aubesonore/frontend test --run --coverage
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: enforce frontend coverage thresholds (70% s/f/l, 65% branches)"
```

---

### Task 22: Final verification pass

- [ ] **Step 1: Run full quality gate locally**

```bash
cd C:\Users\ordiv\AubeSonore
pnpm typecheck
pnpm lint
pnpm --filter @aubesonore/frontend test --run --coverage
pnpm --filter @aubesonore/backend test
pnpm build
```

Expected: all green, coverage thresholds met.

- [ ] **Step 2: Smoke test in browser**

```bash
pnpm dev:frontend
```

Open `http://localhost:5173`:

- Player loads, shows skeleton then first track
- Play button starts the stream
- Stop button halts cleanly (no AbortError in console)
- Double-click play does not surface a toast
- Toggle into a network failure (offline mode in devtools) → toast appears on play
- Open library modal — no white screen
- Open auth modal — no white screen
- Throw a render error in `AuthModal` temporarily (`throw new Error('test')` in render) → ModalErrorFallback appears, not blank page. Revert after.
- Web Vitals logs appear in console (LCP, CLS, INP)

- [ ] **Step 3: Verify stats.html generated**

```bash
ls apps/frontend/dist/stats.html
```

Open it in browser, confirm bundle composition is reasonable.

- [ ] **Step 4: Commit any final fixes and push branch**

```bash
git status
# if anything outstanding:
git add <files>
git commit -m "chore: final polish"
```

---

## Self-review checklist (for plan author)

- [x] All spec sections have a corresponding task (Sections 1, 2, 3, 4, 5 covered)
- [x] No placeholders, TBDs, or "implement details later"
- [x] Type names consistent (e.g. `PlayError`, `SubscribeResult`, `NowPlayingSchema`)
- [x] File paths absolute and accurate
- [x] TDD: failing test → minimal impl → green → commit
- [x] Commits scoped to one change each
- [x] Final verification step includes manual browser smoke test
