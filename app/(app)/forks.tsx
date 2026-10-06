import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Chart, Dot, Lines, ZeroLine, px } from '../../components/Chart';
import I from '../../components/Icon';
import Screen from '../../components/Screen';
import { Btn, BtnText, Card, CardHead, CardSub, CardTitle, ConfirmX, Empty, Field, Input, MoneyInput, PageHead, Select, Sheet, SheetActions, SignToggle, Small, Txt, XBtn, tabular } from '../../components/ui';
import { VB, type Pt } from '../../lib/chart';
import { addMonthKey, monthEnd, monthLabel, monthName, monthOf, nowMs, short, todayIn } from '../../lib/money/dates';
import { exact, money, parseAmount } from '../../lib/money/format';
import { forkValue, pastBalance, scale, type Point } from '../../lib/money/forks';
import { useShell } from '../../lib/shell-context';
import { useTheme } from '../../lib/theme-context';
import type { ForksData } from '../../lib/types';
import { usePage, useRunner } from '../../lib/use-page';

const COLORS = ['#f5a524', '#8b5cf6', '#0ea5e9', '#ec4899'];

export default function ForksScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ new?: string }>();
  const { refreshShell } = useShell();
  const [creating, setCreating] = useState(false);
  const { data, error, loading, reload } = usePage<ForksData>('forks', 290);
  const { run, busy } = useRunner(async () => {
    await Promise.all([reload(), refreshShell()]);
  });
  useEffect(() => {
    if (params.new) setCreating(true);
  }, [params.new]);

  if (!data) return <Screen error={error} loading={loading} onRefresh={reload} refreshing={false}>{null}</Screen>;
  const { me, entries, forecast, balance, recurring, cats } = data.money;
  const { forks, effects } = data;
  const cur = me.currency;
  const m = (n: number, sign = false) => money(n, cur, { sign });

  // Twelve months: three back, this one, eight ahead.
  const thisMonth = monthOf(me.today);
  const months = Array.from({ length: 12 }, (_, i) => addMonthKey(thisMonth, i - 3));
  const from = `${months[0]}-01`;
  const to = monthEnd(`${months[11]}-01`);
  const firstDay = todayIn(me.timezone, new Date(me.balanceSetAt));
  const counted = entries.filter((e) => e.createdAt > me.balanceSetAt);
  const future = new Map(forecast.days.map((d) => [d.date, d.real]));
  const realAt = (date: string): number | null => (date < me.today ? pastBalance(balance, counted, date, firstDay) : date === me.today ? balance : (future.get(date) ?? null));

  const ends = months.map((mo) => monthEnd(`${mo}-01`));
  const past: Point[] = [];
  if (firstDay > from && firstDay < me.today) past.push({ date: firstDay, value: realAt(firstDay)! });
  for (const d of ends) if (d < me.today && realAt(d) !== null) past.push({ date: d, value: realAt(d)! });
  past.sort((a, b) => (a.date < b.date ? -1 : 1));
  const nowPt: Point = { date: me.today, value: balance };
  const ahead: Point[] = [nowPt, ...ends.filter((d) => d > me.today && future.has(d)).map((d) => ({ date: d, value: future.get(d)! }))];
  const realEnd = ahead[ahead.length - 1]!;

  const lines = forks.map((f, i) => {
    const mine = effects.filter((e) => e.forkId === f.id);
    const monthly = mine.reduce((s, e) => s + e.monthly, 0);
    const spec = { startDate: f.startDate, oneTime: f.oneTime, monthly };
    const dates = [f.startDate, ...ends.filter((d) => d > f.startDate), ...(f.startDate < me.today ? [me.today] : [])].filter((d) => d <= realEnd.date).sort();
    const pts: Point[] = [];
    for (const d of [...new Set(dates)]) {
      const r = realAt(d);
      if (r !== null) pts.push({ date: d, value: forkValue(r, spec, d)! });
    }
    const end = forkValue(realEnd.value, spec, realEnd.date);
    return { fork: f, effects: mine, monthly, pts, end, color: COLORS[i % COLORS.length]! };
  });

  const sc = scale([past, ahead, ...lines.map((l) => l.pts)], from, to);
  const toPt = (p: Point): Pt => [sc.x(p.date), sc.y(p.value)];
  const latest = entries[0];
  const fresh = latest && nowMs() - Date.parse(latest.createdAt) < 10 * 60_000;
  const catName = latest?.categoryId ? cats.find((x) => x.id === latest.categoryId)?.name : null;
  const bases = recurring.map((r) => ({ id: r.id, name: r.name, amount: r.amount }));

  return (
    <Screen error={error} onRefresh={reload} refreshing={false}>
      <PageHead
        title="Timeline Forks"
        sub={`Balance by ${monthLabel(months[11]!, me.today)}`}
        icon="fork"
        right={
          <Btn small onPress={() => setCreating(true)}>
            <I d="plus" size={14} stroke={2.6} color={c.onB} />
            <BtnText small>New fork</BtnText>
          </Btn>
        }
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card }}>
          <View style={{ width: 10, height: 32, borderRadius: 5, backgroundColor: '#0f7a63' }} />
          <View>
            <Small>Real life · as you live now</Small>
            <Txt style={[{ fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.44 }, tabular]}>{m(realEnd.value)}</Txt>
          </View>
        </View>
        {lines.map((l) => (
          <View key={l.fork.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: `${l.color}66`, borderRadius: 14, backgroundColor: `${l.color}12` }}>
            <View style={{ width: 10, height: 32, borderRadius: 5, backgroundColor: l.color }} />
            <View>
              <Small>Fork · {l.fork.name.toLowerCase()}</Small>
              <Txt style={[{ fontSize: 22, lineHeight: 27, fontWeight: '700', letterSpacing: -0.44 }, tabular]}>{l.end === null ? '—' : m(l.end)}</Txt>
            </View>
            {l.end !== null && (
              <View style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: l.end - realEnd.value < 0 ? c.negBg2 : c.posBg }}>
                <Txt style={{ fontWeight: '800', color: l.end - realEnd.value < 0 ? c.neg : c.pos }}>{m(l.end - realEnd.value, true)}</Txt>
              </View>
            )}
            <ConfirmX label={`Remove fork ${l.fork.name}`} onConfirm={() => void run('deleteForkAction', { form: { id: l.fork.id } })} />
          </View>
        ))}
      </View>

      <Card>
        <Chart height={280}>
          {(box) => {
            const now = px(toPt(nowPt), box);
            return (
              <>
                <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: now[0], borderLeftWidth: 1, borderStyle: 'dashed', borderColor: c.line2 }}>
                  <Txt style={{ position: 'absolute', top: -2, left: 6, color: c.muted, fontSize: 11, fontWeight: '700' }}>Today</Txt>
                </View>
                {sc.min < 0 && <ZeroLine y={(sc.y(0) / VB.h) * box.h} label={m(0)} />}
                <Lines
                  box={box}
                  lines={[
                    ...(past.length > 0 ? [{ points: [...past, nowPt].map(toPt), color: c.b }] : []),
                    { points: ahead.map(toPt), color: c.b, dashed: true },
                    ...lines.map((l) => ({ points: l.pts.map(toPt), color: l.color, draw: true })),
                  ]}
                />
                <Dot at={now} color={c.b} />
                {lines.map((l) => (l.pts.length > 0 ? <Dot key={l.fork.id} at={px(toPt(l.pts[l.pts.length - 1]!), box)} color={l.color} /> : null))}
              </>
            );
          }}
        </Chart>
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          {months.map((mo, i) => (
            <View key={mo} style={{ flex: 1, alignItems: 'center' }}>
              <Txt style={{ color: c.muted, fontSize: 11, fontWeight: mo === thisMonth ? '800' : '400', opacity: i % 2 ? 0 : 1 }}>{monthName(mo)}</Txt>
            </View>
          ))}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.card }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: '#22c55e' }} />
        <Txt style={{ flex: 1, color: c.muted, fontSize: 13 }}>
          <Txt style={{ color: c.ink, fontSize: 13, fontWeight: '700' }}>Live</Txt> ·{' '}
          <Txt style={{ fontSize: 13, color: fresh ? c.b : c.muted, fontWeight: fresh ? '700' : '400' }}>
            {latest ? `${catName ?? latest.note} ${exact(Math.abs(latest.amount), cur)} applied to ${forks.length ? 'every timeline' : 'real life'}` : forks.length ? 'Every timeline follows your real spending' : 'Real life follows your real spending'}
          </Txt>
        </Txt>
      </View>

      {lines.length === 0 ? (
        <Empty>
          <Txt style={{ fontWeight: '700' }}>Try a life before you live it.</Txt>
          <Txt style={{ color: c.muted }}>A new city, a new job, selling the car. Create a fork with what would change each month and watch both futures update with every real purchase.</Txt>
        </Empty>
      ) : (
        lines.map((l) => (
          <Card key={l.fork.id}>
            <CardHead>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: l.color, marginRight: 8 }} />
                <CardTitle>{l.fork.name}</CardTitle>
              </View>
              <CardSub>Since {short(l.fork.startDate)}</CardSub>
            </CardHead>
            <View style={{ gap: 9, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 13, backgroundColor: `${l.color}14` }}>
              {l.effects.map((e) => (
                <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Txt style={{ flex: 1, fontWeight: '600' }}>{e.name}</Txt>
                  <Txt style={[{ fontWeight: '700', color: e.monthly >= 0 ? c.pos : c.neg }, tabular]}>{m(e.monthly, true)} / mo</Txt>
                </View>
              ))}
              {l.fork.oneTime !== 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Txt style={{ flex: 1, fontWeight: '600' }}>One-off</Txt>
                  <Txt style={[{ fontWeight: '700', color: l.fork.oneTime >= 0 ? c.pos : c.neg }, tabular]}>{m(l.fork.oneTime, true)}</Txt>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Txt style={{ flex: 1, fontWeight: '600' }}>In total</Txt>
                <Txt style={[{ fontWeight: '700', color: l.monthly >= 0 ? c.pos : c.neg }, tabular]}>{m(l.monthly, true)} / mo</Txt>
              </View>
            </View>
          </Card>
        ))
      )}

      <NewFork open={creating} onClose={() => setCreating(false)} currency={cur} bases={bases} busy={busy} onSave={(form) => run('createForkAction', { form }).then((ok) => ok && setCreating(false))} />
    </Screen>
  );
}

type Row = { key: number; name: string; sign: '-' | '+'; amount: string; base?: number };
type Base = { id: string; name: string; amount: number };

// "What if I…" and the monthly differences it makes. A row can start from an
// existing bill or income: type its new amount and the difference is used.
function NewFork({ open, onClose, currency, bases, busy, onSave }: { open: boolean; onClose: () => void; currency: string; bases: Base[]; busy: boolean; onSave: (form: Record<string, string>) => void }) {
  const { c } = useTheme();
  const [name, setName] = useState('');
  const [rows, setRows] = useState<Row[]>([{ key: 0, name: '', sign: '+', amount: '' }]);
  const [next, setNext] = useState(1);
  const [oneSign, setOneSign] = useState<'-' | '+'>('-');
  const [one, setOne] = useState('');
  const [picking, setPicking] = useState(false);
  useEffect(() => {
    if (!open) {
      setName('');
      setRows([{ key: 0, name: '', sign: '+', amount: '' }]);
      setNext(1);
      setOneSign('-');
      setOne('');
    }
  }, [open]);

  const add = (row: Omit<Row, 'key'>) => {
    setRows((r) => [...r.filter((x) => x.name || x.amount), { ...row, key: next }]);
    setNext((n) => n + 1);
  };
  const update = (key: number, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const save = () => {
    const form: Record<string, string> = { name, oneTimeSign: oneSign, oneTime: one };
    rows.forEach((r, i) => {
      const typed = parseAmount(r.amount);
      // For a row based on a bill, the typed value is the new amount.
      const delta = r.base !== undefined && typed !== null ? (r.base < 0 ? -typed : typed) - r.base : null;
      form[`effName${i}`] = r.name;
      form[`effSign${i}`] = delta !== null ? (delta < 0 ? '-' : '+') : r.sign;
      form[`effAmount${i}`] = delta !== null ? String(Math.abs(delta) / 100) : r.amount;
    });
    onSave(form);
  };

  return (
    <Sheet open={open} onClose={onClose} title="New fork" sub="It starts today and follows your real spending from here.">
      <View style={{ gap: 3, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 2, borderColor: c.b, borderRadius: 13 }}>
        <Txt style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>What if I…</Txt>
        <Input value={name} onChangeText={setName} placeholder="move to Austin" autoFocus maxLength={80} style={{ minHeight: 0, padding: 0, borderWidth: 0, backgroundColor: 'transparent', fontSize: 18, fontWeight: '700' }} />
      </View>

      <Field label="Each month it would change" hint="A new salary, rent, a car you would not need. Plus means more money.">
        {null}
      </Field>
      {rows.map((r, i) => {
        const typed = parseAmount(r.amount);
        const delta = r.base !== undefined && typed !== null ? (r.base < 0 ? -typed : typed) - r.base : null;
        return (
          <View key={r.key} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input placeholder={i === 0 ? 'Salary' : 'Rent'} value={r.name} onChangeText={(v) => update(r.key, { name: v })} accessibilityLabel="What changes" />
              </View>
              <XBtn
                onPress={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : [{ key: next, name: '', sign: '+', amount: '' }]))}
                label="Remove"
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {r.base === undefined ? <SignToggle value={r.sign} onChange={(s) => update(r.key, { sign: s })} label="More or less money" /> : <Small>now {money(Math.abs(r.base), currency)}</Small>}
              <View style={{ flex: 1 }}>
                <MoneyInput currency={currency} placeholder={r.base !== undefined ? 'New' : '0'} value={r.amount} onChangeText={(v) => update(r.key, { amount: v })} label="Amount per month" />
              </View>
            </View>
            {delta !== null && delta !== 0 && <Txt style={{ fontWeight: '700', color: delta > 0 ? c.pos : c.neg }}>{money(delta, currency, { sign: true })} / mo</Txt>}
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Btn variant="ghost" small disabled={rows.length >= 8} onPress={() => add({ name: '', sign: '+', amount: '' })}>
          <I d="plus" size={14} stroke={2.6} color={c.ink} />
          <BtnText variant="ghost" small>Add a change</BtnText>
        </Btn>
        {bases.length > 0 && (
          <Btn variant="ghost" small onPress={() => setPicking(true)}>
            Change a bill or income…
          </Btn>
        )}
      </View>

      <Field label="One-off cost or gain when it starts">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <SignToggle value={oneSign} onChange={setOneSign} label="Cost or gain" />
          <View style={{ flex: 1 }}>
            <MoneyInput currency={currency} placeholder="Moving costs" value={one} onChangeText={setOne} label="One-off amount" />
          </View>
        </View>
      </Field>

      <SheetActions>
        <Btn variant="ghost" onPress={onClose}>
          Cancel
        </Btn>
        <Btn style={{ flex: 1 }} busy={busy} onPress={save}>
          Create fork
        </Btn>
      </SheetActions>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Change a bill or income">
        {bases.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => {
              add({ name: b.name, sign: b.amount < 0 ? '-' : '+', amount: '', base: b.amount });
              setPicking(false);
            }}
            style={{ paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9 }}
          >
            <Txt>
              {b.name} · {money(b.amount, currency)}
            </Txt>
          </Pressable>
        ))}
      </Sheet>
    </Sheet>
  );
}
