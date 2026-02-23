import { forwardRef } from 'react';

interface ShareCardRendererProps {
  artUrl: string | undefined;
  title: string;
  artist: string;
}

/**
 * Off-screen 1080x1080 card rendered for PNG export.
 * Uses inline styles because html-to-image doesn't process Tailwind.
 */
export const ShareCardRenderer = forwardRef<HTMLDivElement, ShareCardRendererProps>(
  ({ artUrl, title, artist }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: 1080,
          height: 1080,
          overflow: 'hidden',
          backgroundColor: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Blurred background art */}
        {artUrl && (
          <img
            src={artUrl}
            crossOrigin="anonymous"
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(60px) brightness(0.3)',
              transform: 'scale(1.2)',
            }}
          />
        )}

        {/* Sharp centered artwork */}
        {artUrl && (
          <img
            src={artUrl}
            crossOrigin="anonymous"
            alt=""
            style={{
              position: 'relative',
              width: 540,
              height: 540,
              objectFit: 'cover',
              borderRadius: 32,
              boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
              marginBottom: 48,
            }}
          />
        )}

        {/* Title */}
        <div
          style={{
            position: 'relative',
            textAlign: 'center',
            paddingLeft: 80,
            paddingRight: 80,
          }}
        >
          <div
            style={{
              fontSize: 42,
              fontWeight: 600,
              color: '#ffffff',
              lineHeight: 1.2,
              marginBottom: 12,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 920,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              color: 'rgba(255,255,255,0.6)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 920,
            }}
          >
            {artist}
          </div>
        </div>

        {/* Branding */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            fontSize: 18,
            letterSpacing: 6,
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            fontWeight: 300,
          }}
        >
          AUBESONORE
        </div>
      </div>
    );
  }
);

ShareCardRenderer.displayName = 'ShareCardRenderer';
