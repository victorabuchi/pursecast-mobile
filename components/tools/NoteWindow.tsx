import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { WebView } from 'react-native-webview';
import FloatingWindow from './FloatingWindow';
import { Txt } from '../ui';
import { webUrl } from '../../lib/api-client';
import { useTheme } from '../../lib/theme-context';
import { useTools } from '../../lib/tools-context';

// The note is the web app's own note, with all its features (text styles,
// lists and checklists, tables, pictures, recordings, drawings), shown in a
// window that floats over the app: drag it by the grip, resize it by the corner.
// It is signed in with the app's token, and takes the app's light or dark choice.
export default function NoteWindow() {
  const { c, pref } = useTheme();
  const tools = useTools();
  const [token, setToken] = useState<string | null>(null);
  const [everOpened, setEverOpened] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (tools.open.note) setEverOpened(true);
  }, [tools.open.note]);
  useEffect(() => {
    if (everOpened && !token) SecureStore.getItemAsync('pursecast_session_token').then(setToken).catch(() => undefined);
  }, [everOpened, token]);

  // Runs before the page: the web's own session cookie (so the note can save and
  // load its files), and the light/dark choice the web page reads.
  const theme = pref === 'system' ? "localStorage.removeItem('pursecast:theme');" : `localStorage.setItem('pursecast:theme','${pref}');`;
  const before = token ? `try{document.cookie='pursecast_session=${token}; path=/; max-age=2592000; Secure; SameSite=Lax';${theme}}catch(e){} true;` : 'true;';
  const host = webUrl('').replace(/^https?:\/\//, '');

  return (
    <FloatingWindow id="note" open={tools.open.note} keepMounted minW={260} minH={260} maxW={560} maxH={900} start={({ width, height, top }) => ({ x: Math.max(8, (width - 340) / 2), y: top + 90, w: Math.min(340, width - 16), h: Math.min(460, height - top - 200) })} background={c.card} border={c.line}>
      {({ dragProps }) => (
        <View style={{ flex: 1 }}>
          {/* The grip drags the window. */}
          <View {...dragProps} accessibilityLabel="Move the note" style={{ height: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: c.line2 }} />
          </View>
          <View style={{ flex: 1 }}>
            {everOpened && token ? (
              <WebView
                key={attempt}
                source={{ uri: webUrl('/note-window'), headers: { Authorization: `Bearer ${token}` } }}
                injectedJavaScriptBeforeContentLoaded={before}
                onMessage={(e) => e.nativeEvent.data === 'close' && tools.close('note')}
                onError={() => setFailed(true)}
                onHttpError={() => setFailed(true)}
                onLoadStart={() => setFailed(false)}
                // Links inside a note open in the browser, not in this window.
                onShouldStartLoadWithRequest={(r) => {
                  if (r.url.startsWith('about:') || r.url.startsWith('blob:') || r.url.startsWith('data:') || r.url.includes(host)) return true;
                  void Linking.openURL(r.url);
                  return false;
                }}
                startInLoadingState
                renderLoading={() => (
                  <View style={{ ...fill, alignItems: 'center', justifyContent: 'center', backgroundColor: c.card }}>
                    <ActivityIndicator color={c.b} />
                  </View>
                )}
                javaScriptEnabled
                domStorageEnabled
                sharedCookiesEnabled
                thirdPartyCookiesEnabled
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                mediaCapturePermissionGrantType="grant"
                keyboardDisplayRequiresUserAction={false}
                automaticallyAdjustContentInsets={false}
                bounces={false}
                setSupportMultipleWindows={false}
                style={{ flex: 1, backgroundColor: c.card }}
              />
            ) : null}
            {failed && (
              <View style={{ ...fill, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, backgroundColor: c.card }}>
                <Txt style={{ textAlign: 'center', color: c.muted }}>The note could not load. Check your connection.</Txt>
                <Pressable onPress={() => (setFailed(false), setAttempt((n) => n + 1))} accessibilityRole="button" style={{ height: 38, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.b, alignItems: 'center', justifyContent: 'center' }}>
                  <Txt style={{ color: c.onB, fontWeight: '700' }}>Try again</Txt>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}
    </FloatingWindow>
  );
}

const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
