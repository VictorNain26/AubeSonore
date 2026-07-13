import { useEffect, useState } from 'react';
import { useMoment } from '../../hooks/useMoment';
import { MOMENT_LABELS } from '../../lib/moments';

const fmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function MomentBadge() {
  const moment = useMoment();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <p className="font-display text-sm tracking-widest uppercase text-accent/90 text-center mb-2">
      {MOMENT_LABELS[moment]} · {fmt.format(now)}
    </p>
  );
}
