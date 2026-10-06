import { useEffect, useRef, useState } from 'react';
import { Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fromPlain } from '../../lib/notes/plain';
import * as api from '../../lib/api-client';
import { useTheme } from '../../lib/theme-context';
import I from '../Icon';
import { Txt } from '../ui';

// The floating note. The web edits it as a rich document (text styles,
// pictures, tables, markup); here it is edited as text and checklists ("☐ " and
// "☑ " lines), saved as it is typed. A note holding pictures, tables or
// recordings opens read-only, so nothing in it can be lost from the phone.
// Anything beyond plain lines and checklists (bold, headings, tables, pictures…).
const RICH = /<(?!\/?(div|br|p|ul|li)\b)[a-z]/i;
const RECORDING = /data:(audio|video|image)\//i;

function toPlain(html: string): string {
  if (!/^\s*</.test(html)) return html;
  const text = html
    .replace(/<li[^>]*data-checked="true"[^>]*>/gi, '\n☑ ')
    .replace(/<li[^>]*>/gi, (m) => (/class="checklist"/.test(m) ? '' : '\n☐ '))
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|h[1-6]|li|ul|ol|tr)>/gi, '\n')
    .replace(/<(div|p|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
  return text.replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').replace(/\n+$/, '');
}

export default function NoteSheet({ open, onClose, initial, savedAt }: { open: boolean; onClose: () => void; initial: string; savedAt: string | null }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const readOnly = RICH.test(initial) || RECORDING.test(initial);
  const [text, setText] = useState(() => toPlain(initial));
  const [saved, setSaved] = useState<string | null>(savedAt);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (open) setText(toPlain(initial));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const change = (v: string) => {
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const at = await api.action<string>('saveNotepadAction', { args: [fromPlain(v)] });
        setSaved(at.result ?? new Date().toISOString());
        setError('');
      } catch {
        setError('Not saved. Check your connection.');
      }
    }, 600);
  };
  const toggleLine = () => setText((t) => {
    const lines = t.split('\n');
    const last = lines.length - 1;
    const m = /^([☐☑]) /.exec(lines[last] ?? '');
    lines[last] = m ? (lines[last] ?? '').replace(/^[☐☑] /, '') : `☐ ${lines[last]}`;
    const next = lines.join('\n');
    change(next);
    return next;
  });

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} accessibilityLabel="Close note" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,24,31,0.32)' }} />
        <View style={{ height: '70%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: c.card, paddingBottom: insets.bottom }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 14, paddingHorizontal: 18, paddingBottom: 10 }}>
            <Txt style={{ flex: 1, fontSize: 17, fontWeight: '700' }}>Note</Txt>
            {!readOnly && (
              <Pressable onPress={toggleLine} accessibilityRole="button" accessibilityLabel="Checklist" hitSlop={8}>
                <I d="check" size={18} color={c.muted} />
              </Pressable>
            )}
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8}>
              <I d="x" size={18} color={c.muted} />
            </Pressable>
          </View>
          {readOnly && <Txt style={{ marginHorizontal: 18, marginBottom: 6, color: c.muted, fontSize: 12.5 }}>This note has pictures, tables or recordings. Edit it on the web; here it is read-only.</Txt>}
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 16 }}>
            <TextInput value={text} onChangeText={change} editable={!readOnly} multiline scrollEnabled={false} placeholder="Write a note…" placeholderTextColor={c.muted} textAlignVertical="top" style={{ minHeight: 240, color: c.ink, fontSize: 16, lineHeight: 24, fontFamily: 'Figtree_400Regular' }} />
          </ScrollView>
          <Txt style={{ paddingHorizontal: 18, paddingBottom: 10, color: error ? c.neg : c.muted, fontSize: 12 }}>{error || (saved ? 'Saved' : '')}</Txt>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
