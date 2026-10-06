import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { CatDot, Check, DateField, PriceInput } from '../forms';
import I, { type IconName } from '../Icon';
import { Btn, BtnText, CardSub, Input, MoneyInput, Note, Select, Sheet, Txt, XBtn, tabular } from '../ui';
import { amountOf } from '../../lib/money/calc';
import { convert, type Rates } from '../../lib/money/currencies';
import { money, parseAmount } from '../../lib/money/format';
import { CADENCES, type Cadence } from '../../lib/money/recurrence';
import { useTheme } from '../../lib/theme-context';

type SetRows<R> = (f: (rows: R[]) => R[]) => void;

// The dashed box the optional groups of rows sit in (.owedBox).
function Box({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <View style={{ gap: 10, marginTop: 4, padding: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: c.line2, borderRadius: 13, backgroundColor: c.bg }}>{children}</View>;
}

/* ---------- Bills and subscriptions ---------- */

export type Preset = { name: string; amount?: number; cadence?: Cadence };
// cur: the currency the price is billed in, when not the account's.
export type RepeatRow = { key: number; id?: string; name: string; amount: string; cur?: string; cadence: Cadence; date: string };

// Bills or subscriptions added one at a time: pick a popular one (its usual
// price filled in) or "Something else", and remove any row with ×.
export function RepeatRows({ presets, currency, rates, today, addLabel, max = 20, rows, setRows }: { presets: Preset[]; currency: string; rates: Rates; today: string; addLabel: string; max?: number; rows: RepeatRow[]; setRows: SetRows<RepeatRow> }) {
  const { c } = useTheme();
  const [picking, setPicking] = useState(false);
  const next = rows.reduce((m, r) => Math.max(m, r.key + 1), 0);
  const taken = new Set(rows.map((r) => r.name.toLowerCase()));
  const left = presets.filter((p) => !taken.has(p.name.toLowerCase()));
  const add = (p: Preset | null) => {
    if (rows.length >= max) return;
    setRows((rs) => [...rs, { key: next, name: p?.name ?? '', amount: p?.amount ? String(p.amount / 100) : '', cadence: p?.cadence ?? 'monthly', date: '' }]);
  };
  const update = (key: number, patch: Partial<RepeatRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <>
      {rows.map((r, i) => (
        <View key={r.key} style={{ gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Input value={r.name} placeholder="Name" autoFocus={!r.name} onChangeText={(v) => update(r.key, { name: v })} accessibilityLabel={`Name ${i + 1}`} maxLength={80} />
            </View>
            <XBtn onPress={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} label={`Remove ${r.name || 'row'}`} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <PriceInput account={currency} rates={rates} currency={r.cur ?? currency} onCurrency={(cur) => update(r.key, { cur: cur === currency ? undefined : cur })} value={r.amount} onChange={(v) => update(r.key, { amount: v })} autoFocus={Boolean(r.name) && !r.amount} label={`${r.name || 'Amount'} amount`} />
            </View>
            <View style={{ flex: 1 }}>
              <Select value={r.cadence} onChange={(v) => update(r.key, { cadence: v as Cadence })} label={`${r.name || 'Item'} how often`} options={CADENCES.map(([id, label]) => ({ id, label }))} />
            </View>
          </View>
          <DateField value={r.date} onChange={(v) => update(r.key, { date: v })} min={today} clearable label={`${r.name || 'Item'} next due date`} placeholder="Next due date" />
        </View>
      ))}
      {rows.some((r) => r.amount && presets.some((p) => p.name === r.name && p.amount)) && <Note>Prices filled in are typical ones. Check yours.</Note>}
      {rows.length < max && (
        <>
          <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={addLabel} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.card }}>
            <Txt style={{ fontSize: 15, fontWeight: '500', color: c.muted }}>+ {addLabel}…</Txt>
          </Pressable>
          <Sheet open={picking} onClose={() => setPicking(false)} title={addLabel}>
            {left.map((p) => (
              <Pressable
                key={p.name}
                onPress={() => {
                  add(p);
                  setPicking(false);
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9 }}
              >
                <Txt>{p.name}</Txt>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                add(null);
                setPicking(false);
              }}
              style={{ paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9 }}
            >
              <Txt style={{ fontWeight: '700', color: c.b }}>Something else…</Txt>
            </Pressable>
          </Sheet>
        </>
      )}
    </>
  );
}

/* ---------- Other accounts ---------- */

export type AccountRowState = { key: number; id?: string; name: string; kind: string; amount: string; cur?: string; count: boolean };
export const ACCOUNT_KINDS: Array<[string, string, string]> = [
  ['savings', 'Savings', 'Savings'],
  ['everyday', 'Everyday', 'Second account'],
  ['card', 'Card', 'Travel card'],
  ['cash', 'Cash', 'Cash'],
];

// Accounts besides the main one, each in its own currency. Savings do not
// count in the forecast unless switched on.
export function AccountRows({ currency, rates, rows, setRows }: { currency: string; rates: Rates; rows: AccountRowState[]; setRows: SetRows<AccountRowState> }) {
  const nextKey = rows.reduce((m, r) => Math.max(m, r.key + 1), 0);
  const update = (key: number, patch: Partial<AccountRowState>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = (kind: string) => setRows((rs) => [...rs, { key: nextKey, name: ACCOUNT_KINDS.find(([k]) => k === kind)?.[2] ?? '', kind, amount: '', count: kind !== 'savings' }]);
  const inMain = (r: AccountRowState) => convert(parseAmount(r.amount) ?? 0, r.cur || currency, currency, rates) ?? 0;
  const counted = rows.filter((r) => r.count).reduce((s, r) => s + inMain(r), 0);
  const all = rows.reduce((s, r) => s + inMain(r), 0);
  return (
    <Box>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '700' }}>Other accounts</Txt>
          <CardSub>Savings, a second account, a card in dollars, cash. Optional. Switch on the ones Money Weather should count.</CardSub>
        </View>
        {rows.length > 0 && <Txt style={[{ fontWeight: '700' }, tabular]}>{money(all, currency)}</Txt>}
      </View>
      {rows.map((r) => (
        <View key={r.key} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Input value={r.name} placeholder="Name" onChangeText={(v) => update(r.key, { name: v })} accessibilityLabel="Account name" maxLength={60} />
            </View>
            <XBtn onPress={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} label={`Remove ${r.name || 'account'}`} />
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Select value={r.kind} onChange={(v) => update(r.key, { kind: v })} label={`${r.name || 'Account'} type`} options={ACCOUNT_KINDS.map(([k, label]) => ({ id: k, label }))} />
            </View>
            <View style={{ flex: 1 }}>
              <PriceInput account={currency} rates={rates} currency={r.cur ?? currency} onCurrency={(cur) => update(r.key, { cur: cur === currency ? undefined : cur })} value={r.amount} onChange={(v) => update(r.key, { amount: v })} autoFocus={!r.amount} label={`${r.name || 'Account'} balance`} />
            </View>
          </View>
          <Check checked={r.count} onChange={(v) => update(r.key, { count: v })}>
            In forecast
          </Check>
        </View>
      ))}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        {ACCOUNT_KINDS.map(([k, label]) => (
          <Btn key={k} variant="ghost" small onPress={() => add(k)}>
            <I d={(k === 'savings' ? 'jar' : k === 'cash' ? 'wallet' : 'bank') as IconName} size={14} color="#000" />
            <BtnText variant="ghost" small>{label}</BtnText>
          </Btn>
        ))}
      </View>
      {rows.length > 0 && <CardSub>{money(counted, currency)} counts in the forecast</CardSub>}
    </Box>
  );
}

/* ---------- Money owed and lent ---------- */

export type OwedRow = { key: number; id?: string; who: string; party: 'person' | 'institution'; amount: string; date: string };

// Money the person owes (or is owed), added one at a time: someone they know
// or a bank or other institution, with a running total.
export function OwedRows({ currency, today, rows, setRows, lent = false }: { currency: string; today: string; rows: OwedRow[]; setRows: SetRows<OwedRow>; lent?: boolean }) {
  const { c } = useTheme();
  const total = rows.reduce((s, r) => s + amountOf(r.amount), 0);
  const nextKey = rows.reduce((m, r) => Math.max(m, r.key + 1), 0);
  const update = (key: number, patch: Partial<OwedRow>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const add = (party: OwedRow['party']) => setRows((rs) => [...rs, { key: nextKey, who: '', party, amount: '', date: '' }]);
  return (
    <Box>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '700' }}>{lent ? 'Money people owe you' : 'Money you owe'}</Txt>
          <CardSub>{lent ? 'Money you lent to friends, family or anyone else. Optional.' : 'Loans, credit cards, or money from friends and family. Optional.'}</CardSub>
        </View>
        {rows.length > 0 && <Txt style={[{ fontWeight: '700', color: lent ? c.pos : c.neg }, tabular]}>{money(Math.round(total * 100), currency)}</Txt>}
      </View>
      {rows.map((r) => {
        const tone = r.party === 'institution' ? { bg: c.indigoBg, fg: c.indigo } : lent ? { bg: c.posBg, fg: c.pos } : { bg: c.negBg2, fg: c.neg };
        return (
          <View key={r.key} style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CatDot bg={tone.bg} color={tone.fg}>
                <I d={r.party === 'institution' ? 'bank' : 'user'} size={15} color={tone.fg} />
              </CatDot>
              <View style={{ flex: 1 }}>
                <Input value={r.who} placeholder={r.party === 'institution' ? (lent ? 'Company' : 'Nordea car loan') : lent ? 'Sam' : 'Mom'} autoFocus={!r.who} onChangeText={(v) => update(r.key, { who: v })} accessibilityLabel={lent ? 'Who owes you' : 'Who you owe'} maxLength={60} />
              </View>
              <XBtn onPress={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} label={`Remove ${r.who || 'row'}`} />
            </View>
            <View style={{ marginLeft: 42, gap: 8 }}>
              <MoneyInput currency={currency} value={r.amount} onChangeText={(v) => update(r.key, { amount: v })} label={lent ? `Amount ${r.who || 'they'} owe you` : `Amount owed to ${r.who || 'them'}`} />
              <DateField value={r.date} onChange={(v) => update(r.key, { date: v })} min={today} clearable label={lent ? `${r.who || 'They'} pay you back by` : `Pay ${r.who || 'them'} back by`} placeholder="Pay back by (optional)" />
            </View>
          </View>
        );
      })}
      {rows.length > 0 && <Note>{lent ? 'The date is when you expect it back, if there is one. It counts in Money Weather once it is paid back.' : 'The date is when it should be paid back, if there is one. Money Weather counts it on that day.'}</Note>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Btn variant="ghost" small onPress={() => add('person')}>
          <I d="user" size={14} color={c.ink} />
          <BtnText variant="ghost" small>A person</BtnText>
        </Btn>
        <Btn variant="ghost" small onPress={() => add('institution')}>
          <I d="bank" size={14} color={c.ink} />
          <BtnText variant="ghost" small>A bank or institution</BtnText>
        </Btn>
      </View>
      {rows.length > 0 && (
        <CardSub>
          {rows.length} {lent ? (rows.length === 1 ? 'person' : 'people') : rows.length === 1 ? 'debt' : 'debts'} · {money(Math.round(total * 100), currency)} in total
        </CardSub>
      )}
    </Box>
  );
}

/* ---------- Salary advances ---------- */

export type AdvanceRowState = { key: number; id?: string; amount: string; date: string; note?: string };

// Salary advances on the setup page: the ones already saved show as rows to
// change or remove, and new ones are added the same way.
export function AdvanceRows({ currency, today, rows, setRows }: { currency: string; today: string; rows: AdvanceRowState[]; setRows: SetRows<AdvanceRowState> }) {
  const { c } = useTheme();
  const nextKey = rows.reduce((m, r) => Math.max(m, r.key + 1), 0);
  const total = rows.reduce((s, r) => s + amountOf(r.amount), 0);
  const update = (key: number, patch: Partial<AdvanceRowState>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  return (
    <Box>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '700' }}>Salary advance</Txt>
          <CardSub>Part of your pay early, today or on a later day. It comes off the next payday after it arrives.</CardSub>
        </View>
        {rows.length > 0 && <Txt style={[{ fontWeight: '700', color: c.pos }, tabular]}>{money(Math.round(total * 100), currency)}</Txt>}
      </View>
      {rows.map((r) => (
        <View key={r.key} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CatDot bg={c.posBg} color={c.pos}>
              <I d="wallet" size={15} color={c.pos} />
            </CatDot>
            <View style={{ flex: 1 }}>
              <MoneyInput currency={currency} value={r.amount} onChangeText={(v) => update(r.key, { amount: v })} placeholder="300" autoFocus={!r.amount} label="Advance amount" />
            </View>
            <XBtn onPress={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} label="Remove advance" />
          </View>
          <View style={{ marginLeft: 42, gap: 4 }}>
            <DateField value={r.date} onChange={(v) => update(r.key, { date: v })} min={r.id ? undefined : today} label="Arrives on" />
            {r.note ? <CardSub style={{ fontSize: 12 }}>{r.note}</CardSub> : null}
          </View>
        </View>
      ))}
      <Btn variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => setRows((rs) => [...rs, { key: nextKey, amount: '', date: today }])}>
        <I d="plus" size={14} stroke={2.6} color={c.ink} />
        <BtnText variant="ghost" small>Add a salary advance</BtnText>
      </Btn>
    </Box>
  );
}
