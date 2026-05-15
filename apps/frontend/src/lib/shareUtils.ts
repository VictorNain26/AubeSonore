import type { ReactNode } from 'react';
import type SatoriFn from 'satori';
import type * as ResvgModule from '@resvg/resvg-wasm';

// Lazy-loaded heavy pieces (satori + resvg-wasm + Inter font). All cached at
// module scope so the cost is paid once per session, not per share.

const SHARE_CARD_SIZE = 1080;

let satoriPromise: Promise<typeof SatoriFn> | null = null;
let resvgPromise: Promise<typeof ResvgModule> | null = null;
let wasmReady: Promise<void> | null = null;
let fontsCache: { regular: ArrayBuffer; bold: ArrayBuffer } | null = null;

function getSatori(): Promise<typeof SatoriFn> {
  satoriPromise ??= import('satori').then((m) => m.default);
  return satoriPromise;
}

function getResvg(): Promise<typeof ResvgModule> {
  resvgPromise ??= import('@resvg/resvg-wasm');
  return resvgPromise;
}

async function ensureWasm(): Promise<void> {
  if (wasmReady) return wasmReady;
  wasmReady = (async () => {
    const [resvg, wasmUrlModule] = await Promise.all([
      getResvg(),
      import('@resvg/resvg-wasm/index_bg.wasm?url'),
    ]);
    await resvg.initWasm(fetch(wasmUrlModule.default));
  })();
  return wasmReady;
}

async function loadFonts(): Promise<{ regular: ArrayBuffer; bold: ArrayBuffer }> {
  if (fontsCache) return fontsCache;
  const [regularUrlMod, boldUrlMod] = await Promise.all([
    import('@fontsource/inter/files/inter-latin-400-normal.woff?url'),
    import('@fontsource/inter/files/inter-latin-600-normal.woff?url'),
  ]);
  const [regular, bold] = await Promise.all([
    fetch(regularUrlMod.default).then((r) => r.arrayBuffer()),
    fetch(boldUrlMod.default).then((r) => r.arrayBuffer()),
  ]);
  fontsCache = { regular, bold };
  return fontsCache;
}

export async function generateShareImage(jsx: ReactNode): Promise<Blob> {
  const [satori, resvg, fonts] = await Promise.all([getSatori(), getResvg(), loadFonts()]);
  await ensureWasm();

  // satori's element parameter is typed loosely (any-ish ReactNode-equivalent);
  // ReactNode is a strict subtype, no cast needed.
  const svg = await satori(jsx, {
    width: SHARE_CARD_SIZE,
    height: SHARE_CARD_SIZE,
    fonts: [
      { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fonts.bold, weight: 600, style: 'normal' },
    ],
  });

  const png = new resvg.Resvg(svg).render().asPng();
  return new Blob([new Uint8Array(png)], { type: 'image/png' });
}

export async function shareOrDownload(
  blob: Blob,
  filename: string,
  shareData?: { title: string; text: string }
): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        ...(shareData?.title && { title: shareData.title }),
        ...(shareData?.text && { text: shareData.text }),
      });
      return;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
