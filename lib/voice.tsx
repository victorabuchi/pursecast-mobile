import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import I from '../components/Icon';
import { Txt } from '../components/ui';
import { useTheme } from './theme-context';

export const MAX_SECONDS = 60;

// Voice notes are kept as small data: URLs, like the web app's: about a minute
// of mono audio at a low bit rate.
const OPTIONS = { ...RecordingPresets.LOW_QUALITY, numberOfChannels: 1, sampleRate: 22050, bitRate: 32000 };

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(OPTIONS);
  const [audio, setAudio] = useState('');
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const stop = async () => {
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (uri) {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        setAudio(`data:audio/mp4;base64,${base64}`);
      }
    } catch {
      setError('The recording could not be saved. Try again, or write the note instead.');
    }
  };

  const start = async () => {
    setError('');
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('denied');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError('Pursecast could not use the microphone. Allow it in Settings, or write the note instead.');
    }
  };

  // The minute is up.
  useEffect(() => {
    if (recording && seconds >= MAX_SECONDS) void stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, recording]);

  return { audio, recording, seconds, error, start, stop, clear: () => setAudio('') };
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Plays a voice note kept as a data: URL (the web's <audio controls>). The
// audio is written to a cache file first, which the native players can open.
export function VoicePlayer({ src, autoPlay }: { src: string; autoPlay?: boolean }) {
  const { c } = useTheme();
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const path = `${FileSystem.cacheDirectory}voice-${src.length}-${src.slice(-24).replace(/[^a-z0-9]/gi, '')}.m4a`;
    FileSystem.writeAsStringAsync(path, src.replace(/^data:[^,]*,/, ''), { encoding: FileSystem.EncodingType.Base64 })
      .then(() => alive && setUri(path))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [src]);
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);
  useEffect(() => {
    if (autoPlay && uri) {
      void setAudioModeAsync({ playsInSilentMode: true }).then(() => player.play());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);
  const progress = status.duration ? Math.min(1, status.currentTime / status.duration) : 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 40, paddingHorizontal: 10, borderRadius: 20, backgroundColor: c.soft, alignSelf: 'stretch' }}>
      <Pressable
        disabled={!uri}
        onPress={() => {
          if (status.playing) player.pause();
          else {
            if (status.duration && status.currentTime >= status.duration - 0.1) void player.seekTo(0);
            player.play();
          }
        }}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause' : 'Play'}
        style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c.b, alignItems: 'center', justifyContent: 'center', opacity: uri ? 1 : 0.5 }}
      >
        <I d={status.playing ? 'pause' : 'play'} size={13} color={c.onB} />
      </Pressable>
      <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: c.line2 }}>
        <View style={{ width: `${progress * 100}%`, height: 4, borderRadius: 2, backgroundColor: c.b }} />
      </View>
      <Txt style={{ color: c.muted, fontSize: 12, fontVariant: ['tabular-nums'] }}>{fmt(status.playing || status.currentTime ? status.currentTime : status.duration || 0)}</Txt>
    </View>
  );
}
