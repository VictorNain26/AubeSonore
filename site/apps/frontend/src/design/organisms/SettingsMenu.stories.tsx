import type { Meta, StoryObj } from '@storybook/react-vite';
import { SettingsMenuView } from './SettingsMenu';

const meta = {
  title: 'Organisms/SettingsMenu',
  component: SettingsMenuView,
  parameters: {
    docs: {
      description: {
        component:
          'Menu unique de réglages (Base UI) : thème et langue en groupes radio, plus compte (nom/email, déconnexion) quand un utilisateur est connecté. Anonyme : déclencheur roue dentée.',
      },
    },
  },
  argTypes: {
    theme: { control: 'inline-radio', options: ['light', 'dark'] },
    locale: { control: 'inline-radio', options: ['fr', 'en'] },
  },
  args: {
    theme: 'light',
    locale: 'fr',
    onThemeChange: () => undefined,
    onLocaleChange: () => undefined,
    onSignOut: () => undefined,
  },
} satisfies Meta<typeof SettingsMenuView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Authenticated: Story = {
  parameters: {
    docs: {
      description: { story: 'Connecté : avatar à initiale, en-tête compte et déconnexion.' },
    },
  },
  args: {
    user: { name: 'Victor', email: 'victor@example.com' },
  },
};

export const Anonymous: Story = {
  parameters: {
    docs: { description: { story: 'Anonyme : roue dentée, thème et langue uniquement.' } },
  },
  args: {
    user: null,
  },
};
