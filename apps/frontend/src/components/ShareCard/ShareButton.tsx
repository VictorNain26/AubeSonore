import { useState, useRef, useCallback } from 'react';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateShareImage, shareOrDownload } from '../../lib/shareUtils';
import { ShareCardRenderer } from './ShareCardRenderer';

interface ShareButtonProps {
  artUrl: string | undefined;
  title: string;
  artist: string;
  trackUrl?: string | undefined;
}

export function ShareButton({ artUrl, title, artist, trackUrl }: ShareButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(() => {
    if (!cardRef.current || isGenerating) return;

    setIsGenerating(true);
    void (async () => {
      try {
        const blob = await generateShareImage(cardRef.current!);
        const filename = `aubesonore-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
        const text = trackUrl
          ? `${title} — ${artist}\n${trackUrl}`
          : `J'écoute ${title} de ${artist} sur AubeSonore`;
        await shareOrDownload(blob, filename, {
          title: `${title} — ${artist}`,
          text,
        });
      } catch (err) {
        console.error('[ShareButton] Error generating share image:', err);
      } finally {
        setIsGenerating(false);
      }
    })();
  }, [title, artist, trackUrl, isGenerating]);

  return (
    <>
      <button
        onClick={() => handleShare()}
        disabled={isGenerating}
        className={cn(
          'p-2.5 sm:p-3 rounded-full transition-all duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer',
          'backdrop-blur-md shadow-lg active:scale-95 border',
          'bg-black/60 text-white hover:bg-black/70 border-white/20',
          isGenerating && 'animate-pulse'
        )}
        title="Partager"
        aria-label="Partager ce morceau"
      >
        <Share2 className="w-5 h-5" />
      </button>

      {/* Off-screen renderer */}
      <ShareCardRenderer ref={cardRef} artUrl={artUrl} title={title} artist={artist} />
    </>
  );
}
