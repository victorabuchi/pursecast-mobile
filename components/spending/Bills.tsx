import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Check, DateField, PriceInput, Tag } from '../forms';
import { CatDot } from '../forms';
import I from '../Icon';
import { Btn, BtnText, Card, CardHead, CardSub, CardTitle, Field, Input, LinkBtn, MoneyInput, Note, Select, Sheet, SheetActions, SignToggle, Small, Txt, tabular } from '../ui';
import { addMonths, monthName, short } from '../../lib/money/dates';
import { exact, money } from '../../lib/money/format';
import { POPULAR_BILLS, POPULAR_SUBSCRIPTIONS } from '../../lib/money/presets';
import { CADENCES, occurrences, perMonth } from '../../lib/money/recurrence';
import type { Rates } from '../../lib/money/currencies';
import { useTheme } from '../../lib/theme-context';
import type { Cat, Money, RecurringRow } from '../../lib/types';

type Run = (name: string, payload?: { form?: Record<string, unknown> }) => Promise<boolean>;

const BACK = '/spending?tab=bills';

function RecurringForm({ row, currency, rates, today, types, preset, run, busy, onDone }: { row?: RecurringRow; currency: string; rates: Rates; today: string; types: Cat[]; preset?: Cat; run: Run; busy: boolean; onDone: () => void }) {
  const billed = row?.priceCurrency && row.priceAmount !== null ? { cur: row.priceCurrency, cents: row.priceAmount } : row && row.amount ? { cur: currency, cents: Math.abs(row.amount) } : null;
  const [direction, setDirection] = useState<'-' | '+'>(preset?.kind === 'income' ? '+' : '-');
  const [name, setName] = useState(row?.name ?? '');
  const [amount, setAmount] = useState(billed ? String(billed.cents / 100) : '');
  const [cur, setCur] = useState(billed?.cur ?? currency);
  const [cadence, setCadence] = useState<string>(row?.cadence ?? 'monthly');
  const [nextDate, setNextDate] = useState(row?.nextDate ?? '');
  const [categoryId, setCategoryId] = useState(row?.categoryId ?? preset?.id ?? '');
  const [variable, setVariable] = useState(Boolean(row?.variable));
  const [focus, setFocus] = useState(false);

  // The names the web offers as you type.
  const names = (preset?.name === 'Subscriptions' ? POPULAR_SUBSCRIPTIONS : preset?.kind === 'income' ? [{ name: 'Salary' }, { name: 'Child benefit' }, { name: 'Side job' }, { name: 'Rent from lodger' }] : [...POPULAR_BILLS, ...POPULAR_SUBSCRIPTIONS]).map((p) => p.name);
  const q = name.trim().toLowerCase();
  const matches = focus && q ? names.filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q).slice(0, 5) : [];

  const save = async () => {
    const ok = await run(row ? 'updateRecurringAction' : 'addRecurringAction', {
      form: { back: BACK, ...(row ? { id: row.id } : { direction }), name, amount, amountCurrency: cur === currency ? '' : cur, cadence, nextDate, categoryId, ...(variable ? { variable: '1' } : {}) },
    });
    if (ok) onDone();
  };

  return (
    <>
      {!row && <SignToggle value={direction} onChange={setDirection} minus="Bill" plus="Income" label="Bill or income" />}
      <Field label="Name">
        <Input value={name} onChangeText={setName} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} placeholder={preset?.name === 'Subscriptions' ? 'Netflix' : preset?.kind === 'income' ? 'Salary' : 'Car insurance'} autoFocus={!row} maxLength={80} autoComplete="off" autoCorrect={false} />
        {matches.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {matches.map((n) => (
              <Pressable key={n} onPress={() => setName(n)} style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: 'rgba(15,122,99,0.1)' }}>
                <Txt style={{ fontSize: 13, fontWeight: '600' }}>{n}</Txt>
              </Pressable>
            ))}
          </View>
        )}
      </Field>
      <Field label="Amount">
        <PriceInput account={currency} rates={rates} currency={cur} onCurrency={setCur} value={amount} onChange={setAmount} placeholder="Leave empty if it varies" label="Amount" />
      </Field>
      <Field label="How often">
        <Select value={cadence} options={CADENCES.map(([id, label]) => ({ id, label }))} onChange={setCadence} label="How often" />
      </Field>
      <Field label="Next due date">
        <DateField value={nextDate} onChange={setNextDate} min={today} label="Next due date" />
      </Field>
      <Field label="Type">
        <Select value={categoryId} options={[...(row ? [] : [{ id: '', label: 'Pick for me' }]), ...types.map((c) => ({ id: c.id, label: c.name }))]} onChange={setCategoryId} label="Type" />
      </Field>
      <Check checked={variable} onChange={setVariable}>
        The price or date changes each time (like Render or Supabase)
      </Check>
      <Note>Varying ones are never posted automatically; log what they really cost. A rough amount helps Money Weather.</Note>
      <SheetActions>
        <Btn variant="ghost" onPress={onDone}>
          Cancel
        </Btn>
        <Btn style={{ flex: 1 }} busy={busy} onPress={save}>
          {row ? 'Save' : 'Add'}
        </Btn>
      </SheetActions>
    </>
  );
}

const BLURB: Record<string, string> = {
  Income: 'Salary and anything else that comes in regularly.',
  Housing: 'Rent, mortgage and housing costs.',
  Subscriptions: 'Streaming, apps and memberships. Yearly ones included.',
  'Bills & insurance': 'Phone, electricity, internet and insurance.',
};

function InlineNote({ children, action, onAction, label }: { children: ReactNode; action: string; onAction: () => void; label?: string }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 4, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start', borderRadius: 7, backgroundColor: useTheme().c.warnBg }}>
      <Txt style={{ color: '#92400e', fontSize: 12, fontWeight: '600' }}>{children}</Txt>
      <Pressable onPress={onAction} accessibilityLabel={label}>
        <Txt style={{ color: useTheme().c.b, fontSize: 12, fontWeight: '700' }}>{action}</Txt>
      </Pressable>
    </View>
  );
}

function BillRow({ r, color, currency, rates, today, types, openAdvance, run, busy }: { r: RecurringRow; color?: string; currency: string; rates: Rates; today: string; types: Cat[]; openAdvance: boolean; run: Run; busy: boolean }) {
  const { c } = useTheme();
  const upcoming = occurrences(r.nextDate, r.cadence, today, addMonths(today, 14)).slice(0, 3);
  const skipped = upcoming.filter((d) => r.skips.includes(d));
  const next = upcoming.find((d) => !r.skips.includes(d));
  const income = r.amount > 0;
  const tint = color ?? '#64748b';
  const [edit, setEdit] = useState(false);
  const [more, setMore] = useState(false);
  const [advance, setAdvance] = useState(openAdvance);
  const [advAmount, setAdvAmount] = useState('');
  const [advDate, setAdvDate] = useState(today);
  useEffect(() => {
    if (openAdvance) setAdvance(true);
  }, [openAdvance]);
  const act = (name: string, form: Record<string, unknown>) => run(name, { form: { back: BACK, ...form } });

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line, opacity: r.paused ? 0.6 : 1 }}>
      <CatDot bg={`${tint}1f`} color={tint}>
        <I d={income ? 'wallet' : 'repeat'} size={15} color={tint} />
      </CatDot>
      <View style={{ flex: 1, minWidth: 120 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <Txt style={{ fontWeight: '700' }} numberOfLines={1}>
            {r.name}
          </Txt>
          {r.paused && <Tag>paused</Tag>}
          {r.variable && <Tag>varies</Tag>}
        </View>
        <Small>
          {CADENCES.find(([cd]) => cd === r.cadence)?.[1]}
          {!r.paused && next ? ` · due ${short(next)}` : ''}
        </Small>
        {skipped.map((d) => (
          <InlineNote key={d} action="Add it back" onAction={() => void act('unskipAction', { id: r.id, date: d })}>
            Skipped for {monthName(d.slice(0, 7), true)}
          </InlineNote>
        ))}
        {r.advances.map((a) => (
          <InlineNote key={a.id} action="Undo" label="Remove advance" onAction={() => void act('cancelAdvanceAction', { id: a.id })}>
            {exact(a.amount, currency)} advance{a.pending ? ` on ${short(a.takenOn)}` : ''} · off the {short(a.payday)} pay
          </InlineNote>
        ))}
      </View>
      {r.paused ? (
        <Btn variant="ghost" small onPress={() => void act('resumeAction', { id: r.id })}>
          Resume
        </Btn>
      ) : (
        <View style={{ alignItems: 'flex-end' }}>
          <Txt style={[{ fontWeight: '700', color: income ? c.pos : c.ink }, tabular]}>
            {r.priceCurrency && r.priceAmount !== null
              ? r.variable
                ? `~${exact(r.priceAmount, r.priceCurrency)}`
                : exact(income ? r.priceAmount : -r.priceAmount, r.priceCurrency, { sign: income })
              : r.variable
                ? r.amount
                  ? `~${exact(Math.abs(r.amount), currency)}`
                  : 'Varies'
                : exact(r.amount, currency, { sign: income })}
          </Txt>
          {r.priceCurrency ? <Small>≈ {exact(Math.abs(r.amount), currency)}</Small> : null}
        </View>
      )}
      {income && !r.paused && (
        <Btn variant="ghost" small onPress={() => setAdvance(true)}>
          Advance
        </Btn>
      )}
      <Pressable onPress={() => setEdit(true)} accessibilityRole="button" accessibilityLabel={`Edit ${r.name}`} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
        <I d="edit" size={14} color={c.muted} />
      </Pressable>
      <Pressable onPress={() => setMore(true)} accessibilityRole="button" accessibilityLabel={`More for ${r.name}`} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
        <I d="more" size={16} color={c.muted} />
      </Pressable>

      <Sheet open={advance} onClose={() => setAdvance(false)} title={`${r.name} advance`} sub="Part of your pay early. The same amount comes off the next payday after it.">
        <Field label="How much">
          <MoneyInput currency={currency} value={advAmount} onChangeText={setAdvAmount} autoFocus label="How much" />
        </Field>
        <Field label="Arrives on">
          <DateField value={advDate} onChange={setAdvDate} min={today} label="Arrives on" />
        </Field>
        <Note>It is added to your balance on that day, and comes off your next payday after it. Money Weather shows both, so you see the dip coming.</Note>
        <SheetActions>
          <Btn variant="ghost" onPress={() => setAdvance(false)}>
            Cancel
          </Btn>
          <Btn
            style={{ flex: 1 }}
            busy={busy}
            onPress={async () => {
              if (await act('takeAdvanceAction', { id: r.id, amount: advAmount, date: advDate })) setAdvance(false);
            }}
          >
            Add advance
          </Btn>
        </SheetActions>
      </Sheet>

      <Sheet open={edit} onClose={() => setEdit(false)} title={`Edit ${r.name}`}>
        <RecurringForm row={r} currency={currency} rates={rates} today={today} types={types} run={run} busy={busy} onDone={() => setEdit(false)} />
      </Sheet>

      <Sheet open={more} onClose={() => setMore(false)} title={r.name}>
        {!r.paused && next && (
          <MenuItem
            icon="skip"
            onPress={() => {
              setMore(false);
              void act('skipOnceAction', { id: r.id, date: next });
            }}
            hint="not using it"
          >
            Skip {monthName(next.slice(0, 7), true)}
          </MenuItem>
        )}
        <MenuItem
          icon={r.paused ? 'play' : 'pause'}
          onPress={() => {
            setMore(false);
            void act(r.paused ? 'resumeAction' : 'pauseAction', { id: r.id });
          }}
        >
          {r.paused ? 'Resume' : 'Pause until I resume'}
        </MenuItem>
        <MenuItem
          icon="trash"
          danger
          onPress={() => {
            setMore(false);
            void act('deleteRecurringAction', { id: r.id });
          }}
        >
          Remove for good
        </MenuItem>
      </Sheet>
    </View>
  );
}

// A row in a menu sheet (.popItem).
export function MenuItem({ icon, onPress, children, hint, danger }: { icon: 'skip' | 'play' | 'pause' | 'trash'; onPress: () => void; children: ReactNode; hint?: string; danger?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 9 }}>
      <I d={icon} color={danger ? c.neg : c.muted} />
      <Txt style={{ color: danger ? c.neg : c.ink }}>{children}</Txt>
      {hint ? <Txt style={{ marginLeft: 'auto', color: c.muted, fontSize: 12 }}>{hint}</Txt> : null}
    </Pressable>
  );
}

export function StatCard({ label, children }: { label: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Card>
      <Txt style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>{label}</Txt>
      {children}
    </Card>
  );
}

export const StatValue = ({ children, color, size = 24 }: { children: ReactNode; color?: string; size?: number }) => <Txt style={[{ fontSize: size, lineHeight: size * 1.25, fontWeight: '700', letterSpacing: -0.48, color }, tabular]}>{children}</Txt>;

// Bills and income grouped by type, each in its own block.
export default function Bills({ data, openNew, openAdvance, run, busy }: { data: Money; openNew: boolean; openAdvance: boolean; run: Run; busy: boolean }) {
  const { c } = useTheme();
  const { me, recurring, cats } = data;
  const cur = me.currency;
  const [adding, setAdding] = useState(openNew);
  const [addingTo, setAddingTo] = useState<Cat | null>(null);
  useEffect(() => {
    if (openNew) setAdding(true);
  }, [openNew]);
  const types = cats.filter((x) => x.kind !== 'flex').sort((a, b) => Number(b.kind === 'income') - Number(a.kind === 'income') || a.position - b.position);
  const typeIds = new Set(types.map((t) => t.id));
  const blocks = [
    ...types.map((t) => ({ key: t.id, title: t.name, cat: t as Cat | undefined, rows: recurring.filter((r) => r.categoryId === t.id) })),
    { key: 'other', title: 'Other bills', cat: undefined, rows: recurring.filter((r) => !r.categoryId || !typeIds.has(r.categoryId)) },
  ].filter((b) => b.cat || b.rows.length);
  // Paused items do not count until resumed.
  const monthly = (rows: RecurringRow[]) => rows.filter((r) => !r.paused).reduce((s, r) => s + perMonth(r.amount, r.cadence), 0);
  const inTotal = monthly(recurring.filter((r) => r.amount > 0));
  const outTotal = -monthly(recurring.filter((r) => r.amount < 0));
  const subs = types.find((t) => t.name === 'Subscriptions');
  const firstIncome = recurring.find((r) => r.amount > 0 && !r.paused);

  return (
    <>
      <StatCard label="Comes in each month">
        <StatValue color={c.pos}>{money(inTotal, cur)}</StatValue>
      </StatCard>
      <StatCard label="Bills each month">
        <StatValue>{money(outTotal, cur)}</StatValue>
      </StatCard>
      <StatCard label="Subscriptions a year">
        <StatValue>{money(subs ? -monthly(recurring.filter((r) => r.categoryId === subs.id)) * 12 : 0, cur)}</StatValue>
      </StatCard>
      <View style={{ gap: 10 }}>
        <Btn style={{ alignSelf: 'flex-start' }} onPress={() => setAdding(true)}>
          <I d="plus" size={15} stroke={2.6} color={c.onB} />
          <BtnText>Add bill or income</BtnText>
        </Btn>
        <Note>Bills and income post themselves on their due date and move your balance, so you only log everyday spending.</Note>
      </View>
      {blocks.map((b) => (
        <Card key={b.key}>
          <CardHead>
            <View style={{ flex: 1 }}>
              <CardTitle>{b.title}</CardTitle>
              {BLURB[b.title] ? <CardSub>{BLURB[b.title]}</CardSub> : null}
            </View>
            <CardSub style={tabular}>{money(Math.abs(monthly(b.rows)), cur)} / mo</CardSub>
          </CardHead>
          {b.rows.length === 0 && <Note>Nothing here yet.</Note>}
          {b.rows.map((r) => (
            <BillRow key={r.id} r={r} color={b.cat?.color} currency={cur} rates={data.rates} today={me.today} types={types} openAdvance={openAdvance && r.id === firstIncome?.id} run={run} busy={busy} />
          ))}
          {b.cat && (
            <Btn variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => setAddingTo(b.cat!)}>
              <I d="plus" size={14} stroke={2.6} color={c.ink} />
              <BtnText variant="ghost" small>{`Add to ${b.title.toLowerCase()}`}</BtnText>
            </Btn>
          )}
        </Card>
      ))}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add bill or income" sub="Anything that repeats. It posts itself on its due date.">
        <RecurringForm currency={cur} rates={data.rates} today={me.today} types={types} run={run} busy={busy} onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={Boolean(addingTo)} onClose={() => setAddingTo(null)} title={`Add to ${addingTo?.name.toLowerCase() ?? ''}`}>
        {addingTo && <RecurringForm currency={cur} rates={data.rates} today={me.today} types={types} preset={addingTo} run={run} busy={busy} onDone={() => setAddingTo(null)} />}
      </Sheet>
    </>
  );
}
