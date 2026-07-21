import type { Meta, StoryObj } from '@storybook/react-vite';
import { Thumbnail } from './Thumbnail';

const meta: Meta<typeof Thumbnail> = {
  component: Thumbnail,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=200&h=200&fit=crop',
    alt: 'Album artwork',
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    src: 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?w=48&h=48&fit=crop',
    alt: 'Small album artwork',
    size: 'sm',
  },
};

export const NoImage: Story = {
  args: {
    size: 'md',
  },
};

export const Fallback: Story = {
  args: {
    src: 'https://invalid-url-that-will-fail.test/image.jpg',
    alt: 'Broken image',
    size: 'md',
  },
};
