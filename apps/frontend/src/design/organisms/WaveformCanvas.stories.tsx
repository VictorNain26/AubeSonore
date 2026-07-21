import { useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { WaveformCanvasView } from './WaveformCanvas';

// `WaveformCanvasView` is a thin `<canvas>` wrapper: the rAF-driven drawing
// loop lives entirely in the `WaveformCanvas` container (refs, analyser
// subscription, resize observer). Storying the view can only show the
// static ref-forwarding shell, not the animated trace itself.

function WaveformCanvasStoryHarness() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  return (
    <div className="w-80">
      <WaveformCanvasView canvasRef={canvasRef} />
    </div>
  );
}

const meta = {
  title: 'Organisms/WaveformCanvas',
  component: WaveformCanvasStoryHarness,
  parameters: {
    docs: {
      description: {
        component:
          "Trace de l'antenne : ligne audio-réactive dessinée en continu par la boucle rAF du container `WaveformCanvas`. La vue présentée ici est la coquille statique du canevas ; l'animation n'est pilotée que par le container.",
      },
    },
  },
} satisfies Meta<typeof WaveformCanvasStoryHarness>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
