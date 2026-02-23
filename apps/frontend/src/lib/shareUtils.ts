import { toPng } from 'html-to-image';

export async function generateShareImage(element: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(element, {
    width: 1080,
    height: 1080,
    pixelRatio: 1,
    cacheBust: true,
  });

  const res = await fetch(dataUrl);
  return res.blob();
}

export async function shareOrDownload(
  blob: Blob,
  filename: string,
  shareData?: { title: string; text: string }
): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' });

  // Try Web Share API
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        ...(shareData?.title && { title: shareData.title }),
        ...(shareData?.text && { text: shareData.text }),
      });
      return;
    } catch (err) {
      // User cancelled or share failed — fall through to download
      if ((err as Error).name === 'AbortError') return;
    }
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
