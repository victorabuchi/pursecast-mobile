import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { CatDot, DateField, Meter, Tag } from '../../components/forms';
import I from '../../components/Icon';
import MoodIcon from '../../components/MoodIcon';
import Screen from '../../components/Screen';
import Bills, { StatCard, StatValue } from '../../components/spending/Bills';
import Owed from '../../components/spending/Owed';
import { Btn, BtnText, Card, CardHead, CardSub, CardTitle, ConfirmX, Empty, Input, MoneyInput, Note, PageHead, Segment, Select, Sheet, SheetActions, Small, Txt, XBtn, tabular } from '../../components/ui';
import Grad from '../../components/Grad';
import BudgetPicker from '../../components/BudgetPicker';
import { amountOf } from '../../lib/money/calc';
import { DEFAULT_CATEGORIES, parseQuick } from '../../lib/money/categories';
import { addMonthKey, monthLabel, monthOf, relative, short } from '../../lib/money/dates';
import { currencySymbol, exact, money } from '../../lib/money/format';
import { isMood } from '../../lib/money/worth';
import { useShell } from '../../lib/shell-context';
import { useTheme } from '../../lib/theme-context';
import type { Cat, Money, SpendingData } from '../../lib/types';
import { usePage, useRunner } from '../../lib/use-page';
import { VoicePlayer } from '../../lib/voice';

type Tab = 'activity' | 'bills' | 'owed' | 'budgets';
const SUBS: Record<Tab, string> = { activity: 'Log it in two seconds', bills: 'Bills, subscriptions and income', owed: 'Money owed and borrowed', budgets: 'Budgets for everyday spending' };

// The last day of a month (YYYY-MM).
function monthEnd(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(Date.UTC(y!, m!, 0)).getUTCDate()).padStart(2, '0')}`;
}

type Pause = { id: string; text: string; date: string; categoryId: string; why: string };

export default function SpendingScreen() {
  const params = useLocalSearchParams<{ tab?: string; month?: string; add?: string; new?: string; advance?: string }>();
  const { refreshShell } = useShell();
  const [tab, setTab] = useState<Tab>('activity');
  const [month, setMonth] = useState<string | null>(null);
  const [pause, setPause] = useState<Pause | null>(null);

  // Links from the forecast, the palette and the bell arrive as parameters.
  useEffect(() => {
    if (params.tab === 'bills' || params.tab === 'owed' || params.tab === 'budgets') setTab(params.tab);
    else if (params.tab === undefined) setTab('activity');
    if (params.month && /^\d{4}-\d{2}$/.test(params.month)) setMonth(params.month);
  }, [params.tab, params.month]);

  const { data, error, loading, reload } = usePage<SpendingData>('spending', undefined, pause ? { pause: pause.id } : undefined);
  const { run, runFull, busy } = useRunner(async () => {
    await Promise.all([reload(), refreshShell()]);
  });

  if (!data) return <Screen error={error} loading={loading} onRefresh={reload} refreshing={false}>{null}</Screen>;
  const money_ = data.money;
  const { me } = money_;

  return (
    <Screen error={error} onRefresh={reload} refreshing={false}>
      <PageHead
        title="Spending"
        sub={SUBS[tab]}
        icon="list"
        right={
          <Segment
            options={[
              { id: 'activity', label: 'Activity' },
              { id: 'bills', label: 'Bills & income' },
              { id: 'owed', label: 'Owed' },
              { id: 'budgets', label: 'Budgets' },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />
      {tab === 'activity' && <Activity data={money_} month={month ?? monthOf(me.today)} onMonth={setMonth} focus={Boolean(params.add)} run={run} runFull={runFull} busy={busy} onPause={setPause} />}
      {tab === 'bills' && <Bills data={money_} openNew={Boolean(params.new)} openAdvance={Boolean(params.advance)} run={run} busy={busy} />}
      {tab === 'owed' && <Owed data={money_} openNew={Boolean(params.new)} run={run} busy={busy} />}
      {tab === 'budgets' && <Budgets data={money_} run={run} busy={busy} />}
      {pause && data.pauseNote && <PauseSheet me={me} cats={money_.cats} note={data.pauseNote} pause={pause} onClose={() => setPause(null)} run={run} busy={busy} />}
    </Screen>
  );
}

type Run = (name: string, payload?: { form?: Record<string, unknown> }) => Promise<boolean>;

function Activity({ data, month, onMonth, focus, run, runFull, busy, onPause }: { data: Money; month: string; onMonth: (m: string) => void; focus: boolean; run: Run; runFull: ReturnType<typeof useRunner>['runFull']; busy: boolean; onPause: (p: Pause) => void }) {
  const { c } = useTheme();
  const { me, cats, entries } = data;
  const cur = me.currency;
  const catById = new Map(cats.map((x) => [x.id, x]));
  const inMonth = entries.filter((e) => monthOf(e.date) === month);
  // Lending, borrowing and paybacks move money but are not spending or income.
  const own = inMonth.filter((e) => !e.debtId);
  const spent = -own.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
  const income = own.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const isThisMonth = month === monthOf(me.today);
  const flexLeft = data.budgets.reduce((s, b) => s + Math.max(0, b.budget - (b.cuts[month] ?? 0) - b.spent), 0);
  const days = [...new Set(inMonth.map((e) => e.date))];
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(isThisMonth ? me.today : monthEnd(month));
  useEffect(() => setDate(isThisMonth ? me.today : monthEnd(month)), [month, isThisMonth, me.today]);

  const add = async () => {
    const res = await runFull('quickAddAction', { form: { text, categoryId, date, back: '/spending' } });
    if (!res) return;
    // Before a purchase future you may regret, the web sends you to a note.
    const p = res.redirect?.params;
    if (p?.['pause']) onPause({ id: p['pause']!, text: p['text'] ?? text, date: p['date'] ?? date, categoryId: p['categoryId'] ?? categoryId, why: p['why'] ?? '' });
    else setText('');
  };

  return (
    <>
      <View style={{ gap: 8, padding: 10, borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.card, shadowColor: '#14181f', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 }}>
        <Input value={text} onChangeText={setText} placeholder="12.50 lunch  ·  +2900 salary" autoFocus={focus} autoCorrect={false} accessibilityLabel="Amount and a word" style={{ borderColor: 'transparent', fontSize: 16 }} returnKeyType="done" onSubmitEditing={add} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Select value={categoryId} onChange={setCategoryId} label="Category" options={[{ id: '', label: 'Category: automatic' }, ...cats.map((x) => ({ id: x.id, label: x.name }))]} />
          </View>
          <View style={{ flex: 1 }}>
            <DateField value={date} onChange={setDate} max={me.today} label="Date" />
          </View>
        </View>
        <Btn busy={busy} onPress={add} disabled={!text.trim()}>
          <I d="plus" size={15} stroke={2.6} color={c.onB} />
          <BtnText>Add</BtnText>
        </Btn>
      </View>

      <StatCard label={`Spent in ${monthLabel(month, me.today)}`}>
        <StatValue>{money(spent, cur)}</StatValue>
      </StatCard>
      <StatCard label="Came in">
        <StatValue color={c.pos}>{money(income, cur)}</StatValue>
      </StatCard>
      <StatCard label={isThisMonth ? 'Left in budgets this month' : 'Net'}>
        <StatValue>{isThisMonth ? money(flexLeft, cur) : money(income - spent, cur, { sign: true })}</StatValue>
      </StatCard>

      <Card>
        <CardHead>
          <Pressable onPress={() => onMonth(addMonthKey(month, -1))} accessibilityRole="button" accessibilityLabel="Previous month" style={{ width: 36, height: 36, borderWidth: 1, borderColor: c.line, borderRadius: 9, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
            <I d="left" size={16} color={c.muted} />
          </Pressable>
          <CardTitle>{monthLabel(month, me.today)}</CardTitle>
          {isThisMonth ? (
            <View style={{ width: 36 }} />
          ) : (
            <Pressable onPress={() => onMonth(addMonthKey(month, 1))} accessibilityRole="button" accessibilityLabel="Next month" style={{ width: 36, height: 36, borderWidth: 1, borderColor: c.line, borderRadius: 9, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
              <I d="right" size={16} color={c.muted} />
            </Pressable>
          )}
        </CardHead>
        {inMonth.length === 0 && (
          <Empty>
            <Txt style={{ fontWeight: '700' }}>Nothing logged {isThisMonth ? 'yet this month' : `in ${monthLabel(month, me.today)}`}.</Txt>
            <Txt style={{ color: c.muted }}>Type an amount and a word above, like "4.20 coffee". Pursecast picks the category and updates your forecast.</Txt>
          </Empty>
        )}
        {days.map((d) => {
          const list = inMonth.filter((e) => e.date === d);
          const total = list.reduce((s, e) => s + e.amount, 0);
          return (
            <View key={d}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14, paddingBottom: 4 }}>
                <Txt style={{ color: c.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.48, textTransform: 'uppercase' }}>{relative(d, me.today)}</Txt>
                <Txt style={[{ color: c.muted, fontSize: 12, fontWeight: '800', letterSpacing: 0.48, textTransform: 'uppercase' }, tabular]}>{exact(total, cur, { sign: true })}</Txt>
              </View>
              {list.map((e) => {
                const cat = e.categoryId ? catById.get(e.categoryId) : undefined;
                const color = cat?.color ?? '#64748b';
                return (
                  <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
                    <CatDot bg={`${color}1f`} color={color}>
                      {(cat?.name ?? e.note)[0]!}
                    </CatDot>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Txt style={{ fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                          {e.note}
                        </Txt>
                        {e.recurringId && <Tag>repeats</Tag>}
                        {e.debtId && <Tag>owed</Tag>}
                        {e.source === 'bank' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 6, paddingVertical: 1, paddingHorizontal: 7, borderRadius: 999, backgroundColor: '#e0f2fe' }}>
                            <I d="bank" size={11} color="#0369a1" />
                            <Txt style={{ color: '#0369a1', fontSize: 10.5, fontWeight: '800', lineHeight: 15 }}>bank</Txt>
                          </View>
                        )}
                      </View>
                      <CategoryPick value={e.categoryId} options={cats.map((x) => ({ id: x.id, name: x.name }))} onChange={(id) => void run('setEntryCategoryAction', { form: { id: e.id, categoryId: id, back: '/spending' } })} />
                    </View>
                    {isMood(e.mood) && <MoodIcon mood={e.mood} size={18} />}
                    <Txt style={[{ fontWeight: '700', color: e.amount > 0 ? c.pos : c.ink }, tabular]}>{exact(e.amount, cur, { sign: e.amount > 0 })}</Txt>
                    <ConfirmX label={`Delete ${e.note}`} onConfirm={() => void run('deleteEntryAction', { form: { id: e.id, back: '/spending' } })} />
                  </View>
                );
              })}
            </View>
          );
        })}
      </Card>
    </>
  );
}

// Changing the category saves right away (.catSelect).
function CategoryPick({ value, options, onChange }: { value: string | null; options: Array<{ id: string; name: string }>; onChange: (id: string) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.id === value);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Category" hitSlop={6} style={{ alignSelf: 'flex-start', maxWidth: 150 }}>
        <Txt style={{ color: c.muted, fontSize: 12 }} numberOfLines={1}>
          {current?.name ?? 'No category'}
        </Txt>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title="Category">
        {[{ id: '', name: 'No category' }, ...options].map((o) => (
          <Pressable
            key={o.id}
            onPress={() => {
              setOpen(false);
              if (o.id !== (value ?? '')) onChange(o.id);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9, backgroundColor: o.id === (value ?? '') ? c.bt : 'transparent' }}
          >
            <Txt style={{ fontWeight: o.id === (value ?? '') ? '700' : '500', color: o.id === (value ?? '') ? c.b : c.ink }}>{o.name}</Txt>
            {o.id === (value ?? '') ? <I d="check" size={16} color={c.b} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

function Budgets({ data, run, busy }: { data: Money; run: Run; busy: boolean }) {
  const { c } = useTheme();
  const { me, cats, budgets } = data;
  const cur = me.currency;
  const month = monthOf(me.today);
  const flex = cats.filter((x) => x.kind === 'flex');
  const other = cats.filter((x) => x.kind !== 'flex');
  const suggested = new Map(DEFAULT_CATEGORIES.map((x) => [x.name, x.budget]));
  const options = flex.map((x) => {
    const b = budgets.find((y) => y.id === x.id);
    return { name: x.name, amount: x.budget || (suggested.get(x.name) ?? 0), color: x.color, spent: b?.spent ?? 0, cut: b?.cuts[month] ?? 0 };
  });
  const initial = flex.filter((x) => x.budget > 0 || (budgets.find((y) => y.id === x.id)?.spent ?? 0) > 0).map((x) => x.name);

  const [shown, setShown] = useState<string[]>(initial);
  const [amounts, setAmounts] = useState<Record<string, string>>(Object.fromEntries(options.map((o) => [o.name, o.amount ? String(o.amount / 100) : ''])));
  const [typeName, setTypeName] = useState('');
  const [typeKind, setTypeKind] = useState<'fixed' | 'income'>('fixed');

  const save = () => {
    const form: Record<string, unknown> = { budgetsAll: '1' };
    shown.forEach((name, i) => {
      form[`budgetName${i}`] = name;
      form[`budgetAmount${i}`] = amounts[name] ?? '';
    });
    void run('saveBudgetsAction', { form });
  };

  return (
    <>
      <Card>
        <CardHead>
          <View style={{ flex: 1 }}>
            <CardTitle>Everyday spending · {monthLabel(month, me.today)}</CardTitle>
            <CardSub>Money Weather spreads these over each month. Remove the ones you do not use.</CardSub>
          </View>
        </CardHead>
        <BudgetPicker options={options} shown={shown} setShown={setShown} amounts={amounts} setAmounts={setAmounts} currency={cur} />
        <Btn busy={busy} onPress={save} style={{ alignSelf: 'flex-start' }}>
          Save budgets
        </Btn>
      </Card>

      <Card>
        <CardTitle>Bill and income types</CardTitle>
        <Note>The blocks on Bills &amp; income. Removing one keeps its bills under Other.</Note>
        {other.map((x: Cat) => (
          <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
            <CatDot bg={`${x.color}1f`} color={x.color}>
              {x.name[0]!}
            </CatDot>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '700' }}>{x.name}</Txt>
              <Small>{x.kind === 'income' ? 'Income' : 'Bills'}</Small>
            </View>
            <ConfirmX label={`Remove ${x.name}`} icon="trash" onConfirm={() => void run('deleteCategoryAction', { form: { id: x.id } })} />
          </View>
        ))}
        <View style={{ gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
          <Input value={typeName} onChangeText={setTypeName} placeholder="New type, like Insurance" maxLength={40} accessibilityLabel="Type name" />
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Select value={typeKind} onChange={(v) => setTypeKind(v as 'fixed' | 'income')} label="Bills or income" options={[{ id: 'fixed', label: 'Bills' }, { id: 'income', label: 'Income' }]} />
            </View>
            <Btn
              variant="ghost"
              small
              onPress={async () => {
                if (await run('addCategoryAction', { form: { back: '/spending?tab=budgets', name: typeName, kind: typeKind } })) setTypeName('');
              }}
            >
              Add
            </Btn>
          </View>
        </View>
      </Card>

    </>
  );
}

// Before a purchase future you may regret: the note you left, then a choice.
function PauseSheet({ me, cats, note, pause, onClose, run, busy }: { me: Money['me']; cats: Cat[]; note: NonNullable<SpendingData['pauseNote']>; pause: Pause; onClose: () => void; run: Run; busy: boolean }) {
  const { c } = useTheme();
  const parsed = useMemo(() => parseQuick(pause.text), [pause.text]);
  if (!parsed) return null;
  const cat = cats.find((x) => x.id === pause.categoryId);
  const regret = /^r(\d+)\/(\d+)$/.exec(pause.why);
  const over = /^b(\d+)$/.exec(pause.why);
  return (
    <Sheet open onClose={onClose} title="Wait. A note from past you.">
      <Grad from="#1e1b4b" to="#0f7a63" style={{ alignItems: 'center', gap: 12, paddingVertical: 22, paddingHorizontal: 18, borderRadius: 16 }}>
        {note.audio ? (
          <View style={{ alignSelf: 'stretch', maxWidth: 320 }}>
            <VoicePlayer src={note.audio} autoPlay />
          </View>
        ) : null}
        <Txt style={{ color: '#fff', fontSize: 20, lineHeight: 27, fontWeight: '800', letterSpacing: -0.2, textAlign: 'center' }}>“{note.text}”</Txt>
        <Txt style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
          You wrote this on {short(note.createdAt.slice(0, 10))}
          {note.skipped > 0 ? ` · it has kept ${money(note.saved, me.currency)} for you so far` : ''}
        </Txt>
      </Grad>
      <View style={{ gap: 9, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 13, backgroundColor: c.bt }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt style={{ flex: 1, fontWeight: '600' }}>
            {parsed.note} {cat ? <Txt style={{ color: c.muted, fontWeight: '500' }}>{cat.name}</Txt> : null}
          </Txt>
          <Txt style={[{ fontWeight: '700' }, tabular]}>{exact(-parsed.amount, me.currency)}</Txt>
        </View>
      </View>
      <Note>
        {regret
          ? `You regretted ${cat?.name.toLowerCase() ?? 'this'} ${regret[1]} of your last ${regret[2]} times.`
          : over
            ? `This takes you ${money(Number(over[1]), me.currency)} over your ${cat?.name.toLowerCase() ?? ''} budget this month.`
            : ''}
      </Note>
      <SheetActions>
        <Btn
          variant="ghost"
          busy={busy}
          onPress={async () => {
            if (await run('quickAddAction', { form: { text: pause.text, date: pause.date, categoryId: pause.categoryId, confirm: '1', back: '/spending' } })) onClose();
          }}
        >
          Log it anyway
        </Btn>
        <Btn
          style={{ flex: 1 }}
          busy={busy}
          onPress={async () => {
            if (await run('skipSpendAction', { form: { note: note.id, amount: String(-parsed.amount / 100), back: '/spending' } })) onClose();
          }}
        >
          Skip it
        </Btn>
      </SheetActions>
    </Sheet>
  );
}
