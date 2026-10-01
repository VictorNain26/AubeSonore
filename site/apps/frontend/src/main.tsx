import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/bricolage-grotesque/wdth.css';
import '@fontsource-variable/geist-mono';
import './index.css';
import { handlePreloadError } from './lib/preloadReload';
import { readLocaleChoice } from './stores/localeStore';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

window.addEventListener('vite:preloadError', () => {
  handlePreloadError(sessionStorage, () => window.location.reload(), Date.now());
});

// The production page arrives pre-rendered (scripts/prerender.mjs): hydrate it.
// The dev server serves an empty root.
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
if (window.location.pathname === '/' && readLocaleChoice() === 'en') {
  window.location.replace(`/en/${window.location.search}${window.location.hash}`);
} else if (root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}

if (import.meta.env.DEV) {
  void import('web-vitals').then(({ onLCP, onCLS, onINP }) => {
    onLCP((m) => console.debug('[CWV] LCP', m));
    onCLS((m) => console.debug('[CWV] CLS', m));
    onINP((m) => console.debug('[CWV] INP', m));
  });
}
