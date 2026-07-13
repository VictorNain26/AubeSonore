import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource-variable/fraunces';
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
