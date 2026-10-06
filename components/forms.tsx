import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useEffect, useState, type ReactNode } from 'react';
import { Image, Platform, Pressable, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { webUrl } from '../lib/api-client';
import { CURRENCY_CODES, convert, type Rates } from '../lib/money/currencies';
import { currencySymbol, exact, parseAmount } from '../lib/money/format';
import { pickPhoto } from '../lib/photo';
import { useTheme } from '../lib/theme-context';
import I from './Icon';
import { Btn, Input, Select, Sheet, SheetActions, Txt, tabular } from './ui';

// The form pieces the web gets from the browser: date fields, checkboxes, a
// price with its currency, a photo.

const toDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12);
};
const toDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const show = (day: string) => toDate(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// <input type="date">: a day as YYYY-MM-DD, empty when unset.
export function DateField({ value, onChange, min, max, label, placeholder = 'Pick a date', clearable }: { value: string; onChange: (day: string) => void; min?: string; max?: string; label?: string; placeholder?: string; clearable?: boolean }) {
  const { c, dark } = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || min || toDay(new Date()));
  const start = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: toDate(value || min || toDay(new Date())), mode: 'date', minimumDate: min ? toDate(min) : undefined, maximumDate: max ? toDate(max) : undefined, onChange: (e, d) => e.type === 'set' && d && onChange(toDay(d)) });
    } else {
      setDraft(value || min || toDay(new Date()));
      setOpen(true);
    }
  };
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.card }}>
        <Pressable onPress={start} accessibilityRole="button" accessibilityLabel={label} style={{ flex: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
          <Txt style={{ fontSize: 15, fontWeight: '500', color: value ? c.ink : c.muted }}>{value ? show(value) : placeholder}</Txt>
        </Pressable>
        {clearable && value ? (
          <Pressable onPress={() => onChange('')} accessibilityLabel="Clear date" hitSlop={8} style={{ paddingHorizontal: 10 }}>
            <I d="x" size={14} color={c.muted} />
          </Pressable>
        ) : null}
      </View>
      <Sheet open={open} onClose={() => setOpen(false)} title={label ?? 'Pick a date'}>
        <DateTimePicker value={toDate(draft)} mode="date" display="inline" themeVariant={dark ? 'dark' : 'light'} accentColor={c.b} minimumDate={min ? toDate(min) : undefined} maximumDate={max ? toDate(max) : undefined} onChange={(_, d) => d && setDraft(toDay(d))} />
        <SheetActions>
          <Btn variant="ghost" onPress={() => setOpen(false)}>
            Cancel
          </Btn>
          <Btn
            style={{ flex: 1 }}
            onPress={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            Done
          </Btn>
        </SheetActions>
      </Sheet>
    </>
  );
}

// .check: a checkbox with its sentence.
export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: checked ? c.b : c.line2, backgroundColor: checked ? c.b : c.card, alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <I d="check" size={12} stroke={3} color={c.onB} /> : null}
      </View>
      <Txt style={{ flex: 1, fontWeight: '600' }}>{children}</Txt>
    </Pressable>
  );
}

// A price with its currency: the symbol opens a list, so a Render plan can be
// entered in dollars while everything else stays in the account currency.
const names = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'currency' });
  } catch {
    return null;
  }
})();

export function PriceInput({ account, rates, currency, onCurrency, value, onChange, placeholder = '0', label, autoFocus }: { account: string; rates: Rates; currency: string; onCurrency: (c: string) => void; value: string; onChange: (v: string) => void; placeholder?: string; label?: string; autoFocus?: boolean }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const sym = currencySymbol(currency);
  const foreign = currency !== account;
  const cents = foreign && value ? parseAmount(value) : null;
  const inAccount = cents ? convert(cents, currency, account, rates) : null;
  return (
    <View style={{ justifyContent: 'center' }}>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={`${label ?? 'Price'} currency`} style={{ position: 'absolute', left: 6, zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28, paddingHorizontal: 6, borderRadius: 8, backgroundColor: foreign ? c.bt : 'transparent' }}>
        <Txt style={{ fontWeight: '600', color: foreign ? c.b : c.muted }}>{sym}</Txt>
        <I d="chevron" size={11} stroke={2.6} color={foreign ? c.b : c.muted} />
      </Pressable>
      <Input value={value} onChangeText={onChange} placeholder={placeholder} keyboardType="decimal-pad" autoFocus={autoFocus} accessibilityLabel={label} style={{ paddingLeft: 34 + sym.length * 9, paddingRight: inAccount !== null ? 78 : 12, ...tabular }} />
      {inAccount !== null && <Txt style={[{ position: 'absolute', right: 10, color: c.muted, fontSize: 12 }, tabular]}>≈ {exact(inAccount, account)}</Txt>}
      <Sheet open={open} onClose={() => setOpen(false)} title="Currency this is billed in">
        {CURRENCY_CODES.map((code) => (
          <Pressable
            key={code}
            onPress={() => {
              onCurrency(code);
              setOpen(false);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9, backgroundColor: code === currency ? c.bt : 'transparent' }}
          >
            <Txt style={{ fontWeight: code === currency ? '700' : '500', color: code === currency ? c.b : c.ink }}>
              {currencySymbol(code)} · {names?.of(code) ?? code}
            </Txt>
            {code === currency ? <I d="check" size={16} color={c.b} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

// An image from the web server: its photo addresses need the bearer token.
export function Photo({ src, size, round }: { src: string; size: number; round?: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    SecureStore.getItemAsync('pursecast_session_token').then(setToken).catch(() => undefined);
  }, []);
  if (src.startsWith('data:')) return <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius: round ? size / 2 : 10 }} />;
  if (!token) return <View style={{ width: size, height: size }} />;
  return <Image source={{ uri: src.startsWith('/') ? webUrl(src) : src, headers: { Authorization: `Bearer ${token}` } }} style={{ width: size, height: size, borderRadius: round ? size / 2 : 10 }} />;
}

// A small photo field: posts `photo` (a small JPEG data: URL) and `photoClear`.
export type PhotoValue = { photo: string; cleared: boolean };
export function PhotoField({ current, value, onChange, label = 'Photo', round }: { current?: string | null; value: PhotoValue; onChange: (v: PhotoValue) => void; label?: string; round?: boolean }) {
  const { c } = useTheme();
  const shown = value.photo || (value.cleared ? '' : (current ?? ''));
  const [error, setError] = useState('');
  const pick = async () => {
    setError('');
    try {
      const photo = await pickPhoto();
      if (photo) onChange({ photo, cleared: false });
    } catch {
      setError('That picture could not be read. Try a JPG or PNG.');
    }
  };
  return (
    <View style={{ gap: 6 }}>
      <Txt style={{ fontSize: 13, fontWeight: '700' }}>{label}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel={shown ? 'Change photo' : 'Add a photo'} style={{ width: 56, height: 56, borderRadius: round ? 28 : 12, borderWidth: 1, borderStyle: shown ? 'solid' : 'dashed', borderColor: c.line2, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {shown ? <Photo src={shown} size={56} round={round} /> : <I d="camera" size={20} color={c.muted} />}
        </Pressable>
        <View style={{ gap: 4, alignItems: 'flex-start' }}>
          <Btn variant="ghost" small onPress={pick}>
            {shown ? 'Change photo' : 'Add a photo'}
          </Btn>
          {shown ? (
            <Pressable onPress={() => onChange({ photo: '', cleared: true })}>
              <Txt style={{ color: c.muted, fontSize: 12.5, fontWeight: '600' }}>Remove</Txt>
            </Pressable>
          ) : null}
        </View>
      </View>
      {error ? <Txt style={{ color: c.neg, fontSize: 12 }}>{error}</Txt> : null}
    </View>
  );
}

// The form fields a PhotoField posts.
export const photoForm = (v: PhotoValue): Record<string, string> => ({ photo: v.photo, ...(v.cleared ? { photoClear: '1' } : {}) });

// The coloured square with a letter or icon in it (.catDot).
export function CatDot({ color, bg, children, size = 34 }: { color: string; bg: string; children: ReactNode; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: 10, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{typeof children === 'string' ? <Txt style={{ fontSize: 13, fontWeight: '800', color }}>{children}</Txt> : children}</View>;
}

// .meter: the thin bar showing how much is used.
export function Meter({ pct, color }: { pct: number; color?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ height: 9, borderRadius: 5, backgroundColor: c.bg, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', borderRadius: 5, backgroundColor: color ?? c.b }} />
    </View>
  );
}

// A small tag next to a name (.tag).
export function Tag({ children }: { children: ReactNode }) {
  return (
    <View style={{ marginLeft: 6, paddingVertical: 1, paddingHorizontal: 7, borderRadius: 999, backgroundColor: '#e0f2fe' }}>
      <Txt style={{ color: '#0369a1', fontSize: 10.5, fontWeight: '800', lineHeight: 15 }}>{children}</Txt>
    </View>
  );
}

export { Select };
