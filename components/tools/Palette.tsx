import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import I from '../Icon';
import { Txt } from '../ui';
import { useGo } from '../../lib/shell-context';
import { useTheme } from '../../lib/theme-context';
import type { PaletteItem } from '../../lib/types';

// Search over pages, actions and your own records (the web's Cmd/Ctrl+K).
export default function Palette({ open, onClose, items }: { open: boolean; onClose: () => void; items: PaletteItem[] }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const go = useGo();
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query ? items.filter((i) => `${i.label} ${i.hint ?? ''} ${i.group}`.toLowerCase().includes(query)) : items.filter((i) => i.group === 'Go to' || i.group === 'Do');
    return list.slice(0, 40);
  }, [items, q]);

  const close = () => {
    setQ('');
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable onPress={close} accessibilityLabel="Close search" style={{ flex: 1, backgroundColor: 'rgba(20,24,31,0.32)', paddingTop: insets.top + 12, paddingHorizontal: 12 }}>
          <Pressable onPress={() => undefined} style={{ maxHeight: '80%', borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.card, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: c.line }}>
              <I d="search" size={18} color={c.muted} />
              <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Search spending, forks, events…" placeholderTextColor={c.muted} accessibilityLabel="Search" autoCorrect={false} style={{ flex: 1, minWidth: 0, height: 56, color: c.ink, fontSize: 16, fontFamily: 'Figtree_400Regular' }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 6 }}>
              {results.length === 0 && <Txt style={{ padding: 16, color: c.muted, textAlign: 'center' }}>Nothing matches “{q}”.</Txt>}
              {results.map((item, i) => (
                <View key={`${item.group}|${item.href}|${item.label}|${i}`}>
                  {item.group !== results[i - 1]?.group && <Txt style={{ paddingTop: 8, paddingHorizontal: 10, paddingBottom: 2, color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 0.66, textTransform: 'uppercase' }}>{item.group}</Txt>}
                  <Pressable
                    onPress={() => {
                      close();
                      go(item.href);
                    }}
                    accessibilityRole="button"
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 9 }}
                  >
                    <Txt>{item.label}</Txt>
                    {item.hint ? (
                      <Txt style={{ flex: 1, color: c.muted, fontSize: 13 }} numberOfLines={1}>
                        {item.hint}
                      </Txt>
                    ) : null}
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
