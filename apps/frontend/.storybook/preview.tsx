import type { Preview } from '@storybook/react-vite';
import { useEffect } from 'react';
import '@fontsource-variable/inter';
import '../src/design/tokens.css';

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
    moment: {
      description: 'Moment de la journée (le papier suit l’heure)',
      toolbar: {
        title: 'Moment',
        icon: 'sun',
        items: [
          { value: 'dawn', title: 'Aube' },
          { value: 'day', title: 'Jour' },
          { value: 'dusk', title: 'Crépuscule' },
          { value: 'night', title: 'Nuit' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    moment: 'night',
  },
  decorators: [
    (Story, context) => {
      const moment = context.globals.moment as string;
      useEffect(() => {
        document.documentElement.setAttribute('data-moment', moment);
        document.body.style.background = 'var(--paper)';
      }, [moment]);
      return (
        <div className="ds" style={{ minHeight: '100vh', padding: '2rem' }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
