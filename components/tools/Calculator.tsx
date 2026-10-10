import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { Txt } from '../ui';
import { evaluate, show } from '../../lib/money/calc';
import { useTheme } from '../../lib/theme-context';

// A calculator like the macOS one: grey digits, orange operators, a history
// tape and extra keys for √, x² and brackets.

type Line = { expr: string; result: string };
const OPS = new Set(['+', '-', '*', '/']);
const pretty = (s: string) => s.replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−').replace(/\./g, ',');
// Long sums shrink to fit the display, like the real one.
const fit = (text: string) => Math.max(18, Math.min(42, 42 - (text.length - 7) * 2.6));

const KEYS: Array<[string, 'num' | 'fn' | 'op', string]> = [
  ['⌫', 'fn', 'Delete'], ['AC', 'fn', 'All clear'], ['%', 'fn', 'Percent'], ['/', 'op', 'Divide'],
  ['7', 'num', '7'], ['8', 'num', '8'], ['9', 'num', '9'], ['*', 'op', 'Times'],
  ['4', 'num', '4'], ['5', 'num', '5'], ['6', 'num', '6'], ['-', 'op', 'Minus'],
  ['1', 'num', '1'], ['2', 'num', '2'], ['3', 'num', '3'], ['+', 'op', 'Plus'],
  ['±', 'num', 'Change sign'], ['0', 'num', '0'], ['.', 'num', 'Decimal comma'], ['=', 'op', 'Equals'],
];

export default function Calculator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  // The window's own colours (the web's --w-* values), light and dark.
  const w = dark
    ? { bg: '#1f1f1f', fg: '#f5f5f7', muted: 'rgba(245,245,247,0.5)', line: 'rgba(255,255,255,0.1)', soft: 'rgba(255,255,255,0.07)', soft2: 'rgba(255,255,255,0.16)', num: '#505052', fn: '#7d7d80' }
    : { bg: '#ececec', fg: '#1d1d1f', muted: 'rgba(29,29,31,0.5)', line: 'rgba(0,0,0,0.1)', soft: 'rgba(0,0,0,0.05)', soft2: 'rgba(0,0,0,0.12)', num: '#fdfdfd', fn: '#d0d0d3' };

  const [expr, setExpr] = useState('');
  const [done, setDone] = useState<Line | null>(null);
  const [tape, setTape] = useState<Line[]>([]);
  const [side, setSide] = useState(false);
  const [sci, setSci] = useState(false);
  const [note, setNote] = useState('');
  const live = expr ? evaluate(expr) : null;

  // The sum lives in a ref too, so fast presses always build on the latest one.
  const cur = useRef({ expr: '', done: null as Line | null });
  const set = (next: string, finished: Line | null = null) => {
    cur.current = { expr: next, done: finished };
    setExpr(next);
    setDone(finished);
  };

  const press = (k: string) => {
    setNote('');
    const { expr: e, done: d } = cur.current;
    if (k === 'AC') return set('');
    if (k === '⌫') return set(e.slice(0, -1));
    if (k === '=') {
      const v = e ? evaluate(e) : null;
      if (v === null) {
        if (e) setNote('Not a complete sum');
        return;
      }
      const line = { expr: e, result: show(v) };
      setTape((t) => [line, ...t].slice(0, 30));
      return set(String(Math.round(v * 1e8) / 1e8), line);
    }
    if (k === '±') {
      const m = /(\(-)?(\d*\.?\d+)$/.exec(e);
      if (!m) return set(e ? `-(${e})` : '-');
      return set(m[1] ? e.slice(0, m.index) + m[2] : `${e.slice(0, m.index)}(-${m[2]}`);
    }
    if (k === 'x²') return set(e ? `${e}^2` : e);
    // After a result, a digit starts over and an operator carries on.
    const base = d && /[\d.√(]/.test(k) ? '' : e;
    const last = base.slice(-1);
    if (OPS.has(k) && OPS.has(last)) return set(base.slice(0, -1) + k);
    if (k === '.' && /\.\d*$/.test(base)) return;
    set(base + k);
  };

  const result = done ? done.result : live !== null && expr ? show(live) : '';
  const shown = expr && !done ? pretty(expr) : (result || '0').replace('.', ',');

  // Keys are round and share the sheet's width, four to a row.
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - 32, 360);
  const size = Math.min(76, Math.floor((cardW - 32 - 3 * 10) / 4));

  const key = (k: string, kind: 'num' | 'fn' | 'op', aria: string, i: number | string) => (
    <Pressable key={i} onPress={() => press(k)} accessibilityRole="button" accessibilityLabel={aria} style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: kind === 'op' ? '#ff9f0a' : kind === 'fn' ? w.fn : w.num, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      {k === '⌫' ? (
        <Svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke={w.fg} strokeWidth={1.8} strokeLinejoin="round">
          <Path d="M8 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-6-7Z" />
          <Path d="m11 9 6 6M17 9l-6 6" />
        </Svg>
      ) : (
        <Txt style={{ color: kind === 'op' ? '#fff' : w.fg, fontSize: kind === 'op' ? 30 : kind === 'fn' ? 22 : 26, lineHeight: 34, fontWeight: '400' }}>{k === '±' ? '⁺∕₋' : pretty(k)}</Txt>
      )}
    </Pressable>
  );
  const round = (on: boolean) => ({ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: w.line, backgroundColor: on ? w.soft2 : w.soft, alignItems: 'center', justifyContent: 'center' } as const);

  // The same shape as the note: a sheet from the bottom with a close button.
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable onPress={onClose} accessibilityLabel="Close calculator" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,24,31,0.32)' }} />
        <View style={{ width: cardW, borderRadius: 22, borderWidth: 1, borderColor: w.line, backgroundColor: w.bg, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 40, shadowOffset: { width: 0, height: 24 }, elevation: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Txt style={{ flex: 1, color: w.fg, fontSize: 17, fontWeight: '700' }}>Calculator</Txt>
            <Pressable onPress={() => setSide((v) => !v)} accessibilityRole="button" accessibilityLabel="History" accessibilityState={{ selected: side }} style={round(side)}>
              <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={w.fg} strokeWidth={1.8}>
                <Rect x={3} y={5} width={18} height={14} rx={3} />
                <Path d="M9 5v14M5.5 9h1.5M5.5 12h1.5M5.5 15h1.5" />
              </Svg>
            </Pressable>
            <Pressable onPress={() => setSci((v) => !v)} accessibilityRole="button" accessibilityLabel="More keys" accessibilityState={{ selected: sci }} style={round(sci)}>
              <Svg viewBox="0 0 24 24" width={20} height={20} fill={w.fg}>
                <Rect x={5} y={2.5} width={14} height={19} rx={3} fill="none" stroke={w.fg} strokeWidth={1.8} />
                <Rect x={8} y={5.5} width={8} height={3} rx={1} />
              </Svg>
            </Pressable>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" hitSlop={8} style={round(false)}>
              <Svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={w.fg} strokeWidth={2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6 6 18" />
              </Svg>
            </Pressable>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2, minHeight: 104, paddingTop: 14, paddingHorizontal: 8, paddingBottom: 10 }}>
            <Txt style={{ color: w.muted, fontSize: 13 }} numberOfLines={1}>
              {done ? pretty(done.expr) : note || ' '}
            </Txt>
            <Txt accessibilityLiveRegion="polite" numberOfLines={1} style={{ color: w.fg, fontSize: fit(shown) + 14, lineHeight: (fit(shown) + 14) * 1.1, fontWeight: '300', letterSpacing: -0.02 * fit(shown), fontVariant: ['tabular-nums'] }}>
              {shown}
            </Txt>
            <Txt style={{ color: '#ff9f0a', fontSize: 13 }}>{!done && result && expr !== result ? `= ${result.replace('.', ',')}` : ' '}</Txt>
          </View>
          {side && (
            <ScrollView style={{ maxHeight: 130, marginBottom: 8 }} contentContainerStyle={{ gap: 4 }}>
              {tape.length === 0 && <Txt style={{ color: w.muted, fontSize: 12 }}>Your sums appear here.</Txt>}
              {tape.map((l, i) => (
                <Pressable key={i} onPress={() => set(String(evaluate(l.expr) ?? ''))} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8, backgroundColor: w.soft }}>
                  <Txt style={{ color: w.muted, fontSize: 13 }}>{pretty(l.expr)}</Txt>
                  <Txt style={{ color: w.fg, fontSize: 15 }}>{l.result.replace('.', ',')}</Txt>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {sci && <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>{['(', ')', '√', 'x²'].map((k) => key(k, 'fn', k === '√' ? 'Square root' : k === 'x²' ? 'Squared' : k, `s${k}`))}</View>}
          <View style={{ gap: 10 }}>
            {[0, 1, 2, 3, 4].map((r) => (
              <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {KEYS.slice(r * 4, r * 4 + 4).map(([k, kind, aria], i) => key(k, kind, aria, `${r}${i}`))}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
