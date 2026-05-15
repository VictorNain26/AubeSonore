// Builds the JSX tree that satori serializes into a 1080x1080 SVG.
//
// satori has a constrained CSS subset (flexbox + a small set of properties),
// so we render with explicit style objects rather than Tailwind classes.
// Notable limitations vs the previous html-to-image renderer:
// - no filter: blur() → we replace the blurred background with a radial dark
//   gradient. The sharp artwork + shadow keep the depth feel.
// - no z-index → siblings stack by source order.

interface ShareCardProps {
  artUrl: string | undefined;
  title: string;
  artist: string;
}

const SIZE = 1080;

export function buildShareCardJSX({ artUrl, title, artist }: ShareCardProps) {
  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0a',
        backgroundImage: 'radial-gradient(circle at center, #1a1a2e 0%, #0a0a0a 75%)',
        fontFamily: 'Inter',
        position: 'relative',
      }}
    >
      {artUrl && (
        <img
          src={artUrl}
          alt=""
          width={540}
          height={540}
          style={{
            borderRadius: 32,
            marginBottom: 48,
            boxShadow: '0 32px 64px rgba(0, 0, 0, 0.5)',
            objectFit: 'cover',
          }}
        />
      )}

      <div
        style={{
          fontSize: 42,
          fontWeight: 600,
          color: '#ffffff',
          marginBottom: 12,
          textAlign: 'center',
          maxWidth: 920,
          paddingLeft: 80,
          paddingRight: 80,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 400,
          color: 'rgba(255, 255, 255, 0.6)',
          textAlign: 'center',
          maxWidth: 920,
          paddingLeft: 80,
          paddingRight: 80,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {artist}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 48,
          fontSize: 18,
          fontWeight: 400,
          letterSpacing: 6,
          color: 'rgba(255, 255, 255, 0.3)',
          textTransform: 'uppercase',
        }}
      >
        AUBESONORE
      </div>
    </div>
  );
}
