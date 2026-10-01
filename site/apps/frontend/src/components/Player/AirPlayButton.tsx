import { useEffect } from 'react';
import { useAirPlayStore } from '../../stores/airplayStore';
import { AirPlayButtonView } from '../../design/molecules/AirPlayButton';

export function AirPlayButton() {
  const available = useAirPlayStore((s) => s.available);
  const isActive = useAirPlayStore((s) => s.isActive);
  const initialize = useAirPlayStore((s) => s.initialize);
  const openPicker = useAirPlayStore((s) => s.openPicker);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!available) return null;

  return <AirPlayButtonView isActive={isActive} onOpenPicker={openPicker} />;
}
