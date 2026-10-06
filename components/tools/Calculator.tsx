import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
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

  const key = (k: string, kind: 'num' | 'fn' | 'op', aria: string, i: number | string) => (
    <Pressable key={i} onPress={() => press(k)} accessibilityRole="button" accessibilityLabel={aria} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: kind === 'op' ? '#ff9f0a' : kind === 'fn' ? w.fn : w.num, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
      {k === '⌫' ? (
        <Svg viewBox="0 0 24 24" width={26} height={26} fill="none" stroke={w.fg} strokeWidth={1.8} strokeLinejoin="round">
          <Path d="M8 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8l-6-7Z" />
          <Path d="m11 9 6 6M17 9l-6 6" />
        </Svg>
      ) : (
        <Txt style={{ color: kind === 'op' ? '#fff' : w.fg, fontSize: kind === 'op' ? 26 : kind === 'fn' ? 20 : 22, lineHeight: 30, fontWeight: '400' }}>{k === '±' ? '⁺∕₋' : pretty(k)}</Txt>
      )}
    </Pressable>
  );

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} accessibilityLabel="Close calculator" style={{ flex: 1, backgroundColor: 'rgba(20,24,31,0.32)', alignItems: 'center', justifyContent: 'center', paddingTop: insets.top, paddingBottom: insets.bottom }}>
        <Pressable onPress={() => undefined} style={{ flexDirection: 'row', borderRadius: 22, backgroundColor: w.bg, borderWidth: 1, borderColor: w.line, overflow: 'hidden' }}>
          {side && (
            <View style={{ width: 170, maxHeight: 520, borderRightWidth: 1, borderRightColor: w.line }}>
              <ScrollView contentContainerStyle={{ gap: 4, paddingTop: 58, paddingRight: 8, paddingBottom: 12, paddingLeft: 12 }}>
                <Txt style={{ color: w.fg, fontSize: 13, fontWeight: '700', marginBottom: 6 }}>History</Txt>
                {tape.length === 0 && <Txt style={{ color: w.muted, fontSize: 12 }}>Your sums appear here.</Txt>}
                {tape.map((l, i) => (
                  <Pressable key={i} onPress={() => set(String(evaluate(l.expr) ?? ''))} style={{ alignItems: 'flex-end', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 8 }}>
                    <Txt style={{ color: w.muted, fontSize: 11 }}>{pretty(l.expr)}</Txt>
                    <Txt style={{ color: w.fg, fontSize: 16 }}>{l.result.replace('.', ',')}</Txt>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
          <View style={{ width: 232, paddingTop: 10, paddingHorizontal: 10, paddingBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingLeft: 8 }}>
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#ff5f57' }} />
              <Pressable onPress={() => setSide((s) => !s)} accessibilityRole="button" accessibilityLabel="History" accessibilityState={{ selected: side }} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: w.line, backgroundColor: side ? w.soft2 : w.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke={w.fg} strokeWidth={1.8}>
                  <Rect x={3} y={5} width={18} height={14} rx={3} />
                  <Path d="M9 5v14M5.5 9h1.5M5.5 12h1.5M5.5 15h1.5" />
                </Svg>
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable onPress={() => setSci((s) => !s)} accessibilityRole="button" accessibilityLabel="More keys" accessibilityState={{ selected: sci }} style={{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: w.line, backgroundColor: sci ? w.soft2 : w.soft, alignItems: 'center', justifyContent: 'center' }}>
                <Svg viewBox="0 0 24 24" width={20} height={20} fill={w.fg}>
                  <Rect x={5} y={2.5} width={14} height={19} rx={3} fill="none" stroke={w.fg} strokeWidth={1.8} />
                  <Rect x={8} y={5.5} width={8} height={3} rx={1} />
                </Svg>
              </Pressable>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2, minHeight: 104, paddingTop: 14, paddingHorizontal: 8, paddingBottom: 10 }}>
              <Txt style={{ color: w.muted, fontSize: 13 }} numberOfLines={1}>
                {done ? pretty(done.expr) : note || ' '}
              </Txt>
              <Txt accessibilityLiveRegion="polite" numberOfLines={1} style={{ color: w.fg, fontSize: fit(shown), lineHeight: fit(shown) * 1.1, fontWeight: '300', letterSpacing: -0.02 * fit(shown), fontVariant: ['tabular-nums'] }}>
                {shown}
              </Txt>
              <Txt style={{ color: '#ff9f0a', fontSize: 13 }}>{!done && result && expr !== result ? `= ${result.replace('.', ',')}` : ' '}</Txt>
            </View>
            {sci && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginBottom: 10 }}>{['(', ')', '√', 'x²'].map((k) => key(k, 'fn', k === '√' ? 'Square root' : k === 'x²' ? 'Squared' : k, `s${k}`))}</View>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center' }}>{KEYS.map(([k, kind, aria], i) => key(k, kind, aria, i))}</View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
