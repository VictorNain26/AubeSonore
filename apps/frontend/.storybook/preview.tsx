import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/instrument-sans';
import '../src/design/storybook.css';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Thème',
      toolbar: {
        title: 'Thème',
        icon: 'sun',
        items: [
          { value: 'light', title: 'Clair' },
          { value: 'dark', title: 'Sombre' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as string;
      useEffect(() => {
        if (theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }
      }, [theme]);
      return (
        <div className="min-h-screen bg-surface p-8 font-sans text-text">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
