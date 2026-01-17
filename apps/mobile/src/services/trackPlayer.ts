import TrackPlayer, {
  Event,
  State,
  Capability,
  AppKilledPlaybackBehavior,
  RepeatMode,
} from 'react-native-track-player';
import { STREAM_URL, DEFAULT_ARTWORK, ENV } from '../config/env';

// ─────────────────────────────────────────────
// Track Player Setup
// ─────────────────────────────────────────────

let isSetup = false;

export async function setupTrackPlayer(): Promise<boolean> {
  if (isSetup) return true;

  try {
    await TrackPlayer.setupPlayer({
      autoHandleInterruptions: true,
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
      ],
    });

    await TrackPlayer.setRepeatMode(RepeatMode.Off);

    isSetup = true;
    return true;
  } catch (error) {
    console.error('Failed to setup TrackPlayer:', error);
    return false;
  }
}

// ─────────────────────────────────────────────
// Stream Management
// ─────────────────────────────────────────────

export async function loadRadioStream(): Promise<void> {
  await TrackPlayer.reset();

  await TrackPlayer.add({
    id: 'radio-stream',
    url: STREAM_URL,
    title: 'Aube Sonore',
    artist: 'Radio en direct',
    artwork: DEFAULT_ARTWORK,
    isLiveStream: true,
  });
}

export async function updateNowPlayingMetadata(
  title: string,
  artist: string,
  artwork?: string
): Promise<void> {
  try {
    await TrackPlayer.updateNowPlayingMetadata({
      title,
      artist,
      artwork: artwork || DEFAULT_ARTWORK,
    });
  } catch (error) {
    console.error('Failed to update metadata:', error);
  }
}

export async function playRadio(): Promise<void> {
  // If no track loaded, load it first
  const queue = await TrackPlayer.getQueue();
  if (queue.length === 0) {
    await loadRadioStream();
  }

  await TrackPlayer.play();
}

export async function stopRadio(): Promise<void> {
  await TrackPlayer.stop();
}

export async function pauseRadio(): Promise<void> {
  await TrackPlayer.pause();
}

export async function setPlayerVolume(volume: number): Promise<void> {
  await TrackPlayer.setVolume(volume);
}

export async function getPlayerState(): Promise<State> {
  const state = await TrackPlayer.getPlaybackState();
  return state.state;
}

export async function isPlayerPlaying(): Promise<boolean> {
  const state = await getPlayerState();
  return state === State.Playing;
}

// ─────────────────────────────────────────────
// Playback Service (for background)
// Doit être enregistré dans index.js
// ─────────────────────────────────────────────

export async function PlaybackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });
}
