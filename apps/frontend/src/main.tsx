import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/young-serif';
import '@fontsource/spectral/400.css';
import '@fontsource/spectral/500.css';
import '@fontsource/spectral/600.css';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

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
