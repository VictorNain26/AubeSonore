import type { Meta, StoryObj } from '@storybook/react-vite';
import { setLocale } from '@/paraglide/runtime.js';
import { LanguageToggle } from './LanguageToggle';

const meta = {
  title: 'Molecules/LanguageToggle',
  component: LanguageToggle,
  parameters: {
    docs: {
      description: {
        component:
          'Bascule la langue de l’interface (FR/EN). Le libellé annonce la langue vers laquelle on va basculer. Le choix persiste en localStorage et la page recharge.',
      },
    },
  },
} satisfies Meta<typeof LanguageToggle>;
export default meta;

type Story = StoryObj<typeof meta>;

export const FromFrench: Story = {
  decorators: [
    (Story) => {
      void setLocale('fr', { reload: false });
      return <Story />;
    },
  ],
};

export const FromEnglish: Story = {
  decorators: [
    (Story) => {
      void setLocale('en', { reload: false });
      return <Story />;
    },
  ],
};
