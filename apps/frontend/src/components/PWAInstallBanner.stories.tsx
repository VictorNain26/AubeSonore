import type { Meta, StoryObj } from '@storybook/react-vite';
import { PWAInstallBannerView } from './PWAInstallBanner';

const meta = {
  title: 'Features/PWAInstallBanner',
  component: PWAInstallBannerView,
  parameters: {
    docs: {
      description: {
        component:
          'Bannière d’installation PWA. `PWAInstallBanner` est le conteneur (écoute `beforeinstallprompt`, `localStorage`, `useBannerSlot`, animation) ; `PWAInstallBannerView`, storyé ici, est la carte présentationnelle pure, sans store ni effet.',
      },
    },
  },
  args: {
    onInstall: () => {},
    onDismiss: () => {},
  },
} satisfies Meta<typeof PWAInstallBannerView>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Defaut: Story = {};
