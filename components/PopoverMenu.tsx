import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';

// A button with a small panel under the top bar (.pop). Closes on a tap
// outside; children get a close function.
export default function PopoverMenu({ button, label, buttonStyle, wide, children }: { button: ReactNode; label: string; buttonStyle: StyleProp<ViewStyle>; wide?: boolean; children: (close: () => void) => ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} style={buttonStyle}>
        {button}
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable onPress={close} accessibilityLabel="Close" style={{ flex: 1 }}>
          <Pressable
            onPress={() => undefined}
            style={{ position: 'absolute', top: insets.top + 56 + 4, right: 12, width: wide ? Math.min(380, width - 24) : Math.min(300, width - 24), maxHeight: height - insets.top - 56 - 24, padding: 8, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card, shadowColor: '#14181f', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 24 }, elevation: 16 }}
          >
            <ScrollView contentContainerStyle={{ gap: 4 }}>{children(close)}</ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export function PopHead({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={{ paddingTop: 8, paddingHorizontal: 10, paddingBottom: 4 }}>
      <PopText bold>{title}</PopText>
      <PopText muted>{sub}</PopText>
    </View>
  );
}

import { Txt } from './ui';
function PopText({ children, bold, muted }: { children: ReactNode; bold?: boolean; muted?: boolean }) {
  const { c } = useTheme();
  return <Txt style={{ fontWeight: bold ? '700' : '400', color: muted ? c.muted : c.ink, fontSize: muted ? 12 : 14 }}>{children}</Txt>;
}

export function PopItem({ icon, onPress, children }: { icon: ReactNode; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 9 }}>
      {icon}
      <Txt>{children}</Txt>
    </Pressable>
  );
}
