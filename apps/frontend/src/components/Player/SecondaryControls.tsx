import { useState, useCallback } from 'react';
import { usePlayer } from '../../lib/player';
import { VolumeControl } from './VolumeControl';
import { AirPlayButton } from './AirPlayButton';

// Volume + output routing, the satellites of the play gesture. Mute-toggle
// bookkeeping (remember-last-volume-before-mute) lives here because it is a
// local concern, not global player state.

export function SecondaryControls() {
  const volume = usePlayer((s) => s.volume);
  const setVolume = usePlayer((s) => s.setVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(1);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, prevVolume, volume, setVolume]);

  const handleVolumeChange = useCallback(
    (val: number) => {
      setVolume(val);
      setIsMuted(val === 0);
      if (val > 0) setPrevVolume(val);
    },
    [setVolume]
  );

  return (
    <div className="flex items-center gap-1">
      <VolumeControl
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
      />
      <AirPlayButton />
    </div>
  );
}
