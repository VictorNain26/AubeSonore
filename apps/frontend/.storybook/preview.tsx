import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '@fontsource-variable/inter';
import '@fontsource-variable/instrument-sans';
import '../src/design/storybook.css';

const FONT_STACKS: Record<string, string> = {
  inter: "'Inter Variable', system-ui, sans-serif",
  instrument: "'Instrument Sans Variable', system-ui, sans-serif",
};

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
      description: 'Thème clair ou sombre',
      toolbar: {
        title: 'Thème',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Clair' },
          { value: 'dark', title: 'Sombre' },
        ],
        dynamicTitle: true,
      },
    },
    fonte: {
      description: 'Candidate typographique',
      toolbar: {
        title: 'Fonte',
        icon: 'paragraph',
        items: [
          { value: 'inter', title: 'Inter' },
          { value: 'instrument', title: 'Instrument Sans' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
    fonte: 'inter',
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme as string;
      const fonte = context.globals.fonte as string;
      useEffect(() => {
        if (theme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.removeAttribute('data-theme');
        }

        document.documentElement.style.setProperty('--p-font-stack', FONT_STACKS[fonte]);
      }, [theme, fonte]);
      return (
        <div className="min-h-screen bg-surface p-8 font-sans text-text">
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
