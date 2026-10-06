import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { currencySymbol } from '../lib/money/format';
import { useTheme } from '../lib/theme-context';
import I, { type IconName } from './Icon';

// The app's building blocks, matching app.module.css: .card, .btn, .input,
// .segment, .sheet, .toast, .confirmX, .pageHead and friends.

const FAMILY: Record<string, string> = { '400': 'Figtree_400Regular', '500': 'Figtree_500Medium', '600': 'Figtree_600SemiBold', '700': 'Figtree_700Bold', '800': 'Figtree_800ExtraBold', normal: 'Figtree_400Regular', bold: 'Figtree_700Bold' };

// Text in Figtree at the app's base size. Weights map to the font files.
export function Txt({ style, ...props }: TextProps) {
  const { c } = useTheme();
  const flat = { ...(StyleSheet.flatten(style) as TextStyle | undefined) };
  const weight = String(flat.fontWeight ?? '400');
  delete flat.fontWeight;
  return <Text {...props} style={[{ color: c.ink, fontSize: 14, lineHeight: 19.6, fontFamily: FAMILY[weight] ?? FAMILY['400'] }, flat]} />;
}

// Amounts line up in columns.
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export function Card({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const { c } = useTheme();
  return <View style={[{ gap: 12, padding: 18, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card }, style]}>{children}</View>;
}

export function CardHead({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, style]}>{children}</View>;
}

export const CardTitle = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => <Txt style={[{ fontSize: 14, fontWeight: '800' }, style]}>{children}</Txt>;

export function CardSub({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Txt style={[{ color: c.muted, fontSize: 13 }, style]}>{children}</Txt>;
}

export function Note({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Txt style={[{ color: c.muted, fontSize: 13 }, style]}>{children}</Txt>;
}

export function Small({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { c } = useTheme();
  return <Txt style={[{ color: c.muted, fontSize: 12 }, style]}>{children}</Txt>;
}

export function TipCard({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, backgroundColor: c.bt }}>
      <Txt style={{ fontSize: 13.5, lineHeight: 21 }}>{children}</Txt>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <View style={{ alignItems: 'flex-start', gap: 10, padding: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line2, borderRadius: 14, backgroundColor: c.card }}>{children}</View>;
}

type BtnProps = { children: ReactNode; onPress?: () => void; variant?: 'primary' | 'ghost' | 'danger'; small?: boolean; wide?: boolean; busy?: boolean; disabled?: boolean; label?: string; style?: StyleProp<ViewStyle> };

// .btn / .btnGhost / .btnDanger (and .btnSmall, .btnWide).
export function Btn({ children, onPress, variant = 'primary', small, wide, busy, disabled, label, style }: BtnProps) {
  const { c } = useTheme();
  const tone = variant === 'primary' ? { bg: c.b, border: c.b, fg: c.onB } : variant === 'danger' ? { bg: c.card, border: c.negLine, fg: c.neg } : { bg: c.card, border: c.line, fg: c.ink };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: small ? 36 : 42, paddingHorizontal: small ? 13 : 18, borderRadius: 10, borderWidth: 1, backgroundColor: tone.bg, borderColor: tone.border, opacity: busy || disabled ? 0.6 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
        wide && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={tone.fg} />
      ) : typeof children === 'string' ? (
        <Txt style={{ color: tone.fg, fontWeight: '700', fontSize: small ? 13 : 14 }}>{children}</Txt>
      ) : (
        children
      )}
    </Pressable>
  );
}

// Text inside a Btn next to an icon.
export function BtnText({ children, variant = 'primary', small }: { children: ReactNode; variant?: 'primary' | 'ghost' | 'danger'; small?: boolean }) {
  const { c } = useTheme();
  const fg = variant === 'primary' ? c.onB : variant === 'danger' ? c.neg : c.ink;
  return <Txt style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 14 }}>{children}</Txt>;
}

// .linkBtn
export function LinkBtn({ children, onPress, size }: { children: ReactNode; onPress?: () => void; size?: number }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8}>
      <Txt style={{ color: c.b, fontWeight: '700', fontSize: size ?? 14 }}>{children}</Txt>
    </Pressable>
  );
}

// .pill
export function Pill({ children, onPress, icon }: { children: ReactNode; onPress?: () => void; icon?: IconName }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 13, borderWidth: 1, borderColor: c.line, borderRadius: 999, backgroundColor: c.card, alignSelf: 'flex-start' }}>
      {icon ? <I d={icon} size={16} color={c.b} /> : null}
      <Txt style={{ fontSize: 13, fontWeight: '700' }}>{children}</Txt>
    </Pressable>
  );
}

// .segment: a row of choices in a rounded tray. On phones it scrolls sideways
// rather than wrapping, as on the web.
export function Segment<T extends string>({ options, value, onChange }: { options: Array<{ id: T; label: ReactNode; icon?: IconName }>; value: T; onChange: (id: T) => void }) {
  const { c } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, maxWidth: '100%' }}>
      <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.card }}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 9, backgroundColor: on ? c.bt : 'transparent' }}>
              {o.icon ? <I d={o.icon} size={15} color={on ? c.b : c.muted} /> : null}
              <Txt style={{ fontWeight: '700', color: on ? c.b : c.muted }}>{o.label}</Txt>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// .input
export function Input({ style, ...props }: TextInputProps) {
  const { c } = useTheme();
  return <TextInput placeholderTextColor={c.muted} {...props} style={[{ minHeight: 44, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.card, color: c.ink, fontSize: 15, fontFamily: FAMILY['500'] }, style]} />;
}

export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? <Txt style={{ fontSize: 13, fontWeight: '700' }}>{label}</Txt> : null}
      {children}
      {hint ? <Txt style={{ color: c.muted, fontSize: 13, fontWeight: '500' }}>{hint}</Txt> : null}
    </View>
  );
}

// .money: an input with the currency symbol inside. The value is the text as
// typed; the server turns it into cents.
export function MoneyInput({ currency, value, onChangeText, placeholder = '0', autoFocus, label }: { currency: string; value: string; onChangeText: (v: string) => void; placeholder?: string; autoFocus?: boolean; label?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ justifyContent: 'center' }}>
      <Txt style={{ position: 'absolute', left: 12, zIndex: 1, color: c.muted, fontWeight: '600' }}>{currencySymbol(currency)}</Txt>
      <Input value={value} onChangeText={onChangeText} placeholder={placeholder} keyboardType="decimal-pad" autoFocus={autoFocus} accessibilityLabel={label} style={{ paddingLeft: 30, ...tabular }} />
    </View>
  );
}

// The text of a money value as the input shows it: whole or decimal units.
export const moneyText = (cents: number | null | undefined): string => (cents === null || cents === undefined ? '' : String(Math.abs(cents) % 100 ? (Math.abs(cents) / 100).toFixed(2) : Math.abs(cents) / 100));

// .sign: − / + as two choices.
export function SignToggle({ value, onChange, minus = '−', plus = '+', label }: { value: '-' | '+'; onChange: (v: '-' | '+') => void; minus?: string; plus?: string; label: string }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', padding: 3, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.bg, alignSelf: 'flex-start' }}>
      {([['-', minus], ['+', plus]] as const).map(([v, text]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[{ minWidth: 36, height: 36, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, value === v && { backgroundColor: c.card, shadowColor: '#14181f', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }]}>
          <Txt style={{ fontWeight: '800', color: value === v ? c.ink : c.muted }}>{text}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

// A choice from a short list, in a sheet (the web's <select>).
export function Select({ value, options, onChange, label, placeholder }: { value: string; options: Array<{ id: string; label: string }>; onChange: (id: string) => void; label?: string; placeholder?: string }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={label} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.card }}>
        <Txt style={{ fontSize: 15, fontWeight: '500', color: current ? c.ink : c.muted, flexShrink: 1 }} numberOfLines={1}>
          {current?.label ?? placeholder ?? ''}
        </Txt>
        <I d="chevron" size={16} color={c.muted} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? 'Choose'}>
        {options.map((o) => (
          <Pressable
            key={o.id}
            onPress={() => {
              onChange(o.id);
              setOpen(false);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9, backgroundColor: o.id === value ? c.bt : 'transparent' }}
          >
            <Txt style={{ fontWeight: o.id === value ? '700' : '500', color: o.id === value ? c.b : c.ink }}>{o.label}</Txt>
            {o.id === value ? <I d="check" size={16} color={c.b} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

// Sheets slide up from the bottom, like the web's phone layout.
const CloseContext = createContext<() => void>(() => {});
export const useCloseSheet = () => useContext(CloseContext);

export function Sheet({ open, onClose, title, sub, children }: { open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; wide?: boolean; children: ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} accessibilityLabel="Close" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20, 24, 31, 0.32)' }]} />
        <View style={{ maxHeight: '92%', borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: c.card }}>
          <CloseContext.Provider value={onClose}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingTop: 8, paddingHorizontal: 18, paddingBottom: 20 + insets.bottom }}>
              <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#d6dbe1' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontSize: 17, fontWeight: '700' }}>{title}</Txt>
                  {sub ? <Txt style={{ marginTop: 2, color: c.muted, fontSize: 13, fontWeight: '500' }}>{sub}</Txt> : null}
                </View>
                <XBtn onPress={onClose} label="Close" />
              </View>
              {children}
            </ScrollView>
          </CloseContext.Provider>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// .sheetActions: the cancel and confirm buttons at the foot of a sheet.
export function SheetActions({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', gap: 8 }}>{children}</View>;
}

// .xBtn
export function XBtn({ onPress, label, icon = 'x', disabled }: { onPress: () => void; label: string; icon?: IconName; disabled?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
      <I d={icon} size={icon === 'x' ? 16 : 14} color={c.muted} />
    </Pressable>
  );
}

// The × that removes something. The first tap only asks; removing needs a
// second, deliberate tap, so a brush while scrolling never deletes anything.
export function ConfirmX({ label, question, action = 'Remove', icon = 'x', onConfirm, disabled }: { label: string; question?: string; action?: string; icon?: 'x' | 'trash'; onConfirm: () => void; disabled?: boolean }) {
  const { c } = useTheme();
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 8000);
    return () => clearTimeout(t);
  }, [asking]);
  return (
    <View style={{ position: 'relative', zIndex: asking ? 30 : 0 }}>
      <XBtn onPress={() => setAsking((a) => !a)} label={label} icon={icon === 'x' ? 'x' : 'trash'} disabled={disabled} />
      {asking && (
        <View accessibilityRole="alert" style={{ position: 'absolute', top: 36, right: -4, zIndex: 30, gap: 10, minWidth: 180, maxWidth: 240, padding: 12, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 18 }, elevation: 10 }}>
          <Txt style={{ fontSize: 13.5, fontWeight: '600' }}>{question ?? `${label}?`}</Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
            <Pressable onPress={() => setAsking(false)} style={{ paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.card }}>
              <Txt style={{ fontSize: 13.5 }}>Cancel</Txt>
            </Pressable>
            <Pressable
              onPress={() => {
                setAsking(false);
                onConfirm();
              }}
              style={{ paddingVertical: 7, paddingHorizontal: 14, borderWidth: 1, borderColor: c.neg, borderRadius: 10, backgroundColor: c.neg }}
            >
              <Txt style={{ fontSize: 13.5, color: '#fff' }}>{action}</Txt>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// .pageHead
export function PageHead({ title, sub, icon, right }: { title: string; sub: string; icon: IconName; right?: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
      <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.bt, alignItems: 'center', justifyContent: 'center' }}>
        <I d={icon} size={22} color={c.b} />
      </View>
      <View style={{ flex: 1 }}>
        <Txt accessibilityRole="header" style={{ fontSize: 22, lineHeight: 25, fontWeight: '700', letterSpacing: -0.44 }}>
          {title}
        </Txt>
        <Txt style={{ color: c.b, fontSize: 11.5, lineHeight: 16, fontWeight: '800', letterSpacing: 0.92, textTransform: 'uppercase' }}>{sub}</Txt>
      </View>
      {right ? <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>{right}</View> : null}
    </View>
  );
}

// .toast: a one-off message at the foot of the screen.
type ToastValue = { show: (text: string, error?: boolean) => void };
const ToastContext = createContext<ToastValue>({ show: () => {} });
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children, bottom = 24 }: { children: ReactNode; bottom?: number }) {
  const [shown, setShown] = useState<{ text: string; error: boolean; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (text: string, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setShown({ text, error, key: Date.now() });
    timer.current = setTimeout(() => setShown(null), error ? 5000 : 3200);
  };
  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {shown && (
        <Pressable key={shown.key} onPress={() => setShown(null)} accessibilityRole={shown.error ? 'alert' : undefined} style={{ position: 'absolute', left: 16, right: 16, bottom, zIndex: 70, alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '100%', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 13, backgroundColor: '#14181f', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 18 }, elevation: 12 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: shown.error ? '#e5484d' : '#22c55e', alignItems: 'center', justifyContent: 'center' }}>
              <I d={shown.error ? 'x' : 'check'} size={13} stroke={3} color="#fff" />
            </View>
            <Txt style={{ color: '#fff', fontWeight: '700', flexShrink: 1 }}>{shown.text}</Txt>
          </View>
        </Pressable>
      )}
    </ToastContext.Provider>
  );
}
