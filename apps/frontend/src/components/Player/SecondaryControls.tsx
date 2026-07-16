import { useState, useCallback } from 'react';
import { usePlayer } from '../../lib/player';
import AirPlayButton from './AirPlayButton';
import { VolumeControl } from './VolumeControl';
import { SleepTimer } from './SleepTimer';

// Left-side cluster of secondary controls (airplay / volume / sleep timer).
// Volume mute-toggle bookkeeping lives here because it is a local concern
// (rememberlast-volume-before-mute), not global player state.

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
    <div className="flex-1 flex justify-start items-center gap-1">
      <AirPlayButton />
      <VolumeControl
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
      />
      <SleepTimer />
    </div>
  );
}
