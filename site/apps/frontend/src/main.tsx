import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource-variable/inter';
import '@fontsource-variable/instrument-sans';
import './index.css';
import { initTheme } from './lib/theme';
import { handlePreloadError } from './lib/preloadReload';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

window.addEventListener('vite:preloadError', () => {
  handlePreloadError(sessionStorage, () => window.location.reload(), Date.now());
});

initTheme();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.env.DEV) {
  void import('web-vitals').then(({ onLCP, onCLS, onINP }) => {
    onLCP((m) => console.debug('[CWV] LCP', m));
    onCLS((m) => console.debug('[CWV] CLS', m));
    onINP((m) => console.debug('[CWV] INP', m));
  });
}
