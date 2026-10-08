import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import { Txt } from './ui';

// What a screen shows when it fails while drawing, instead of the app closing:
// the message, the top of the trace (so it can be reported), and a way to retry.
export default function ErrorScreen({ error, retry }: { error: Error; retry: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const trace = (error.stack ?? '').split('\n').slice(0, 8).join('\n');
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ gap: 14, padding: 16, paddingTop: insets.top + 24 }}>
      <View style={{ gap: 8, padding: 18, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card }}>
        <Txt style={{ fontSize: 17, fontWeight: '700' }}>This screen could not load</Txt>
        <Txt style={{ color: c.muted }}>Nothing you saved is lost. Try again, and if it keeps happening, send the text below.</Txt>
        <Pressable onPress={retry} accessibilityRole="button" style={{ alignSelf: 'flex-start', height: 42, paddingHorizontal: 18, borderRadius: 10, backgroundColor: c.b, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ color: c.onB, fontWeight: '700' }}>Try again</Txt>
        </Pressable>
      </View>
      <View style={{ gap: 6, padding: 14, borderRadius: 12, backgroundColor: c.negBg, borderWidth: 1, borderColor: c.negLine }}>
        <Txt selectable style={{ color: c.neg, fontWeight: '700' }}>
          {error.name}: {error.message}
        </Txt>
        <Txt selectable style={{ color: c.muted, fontSize: 11, lineHeight: 15 }}>
          {trace}
        </Txt>
      </View>
    </ScrollView>
  );
}
