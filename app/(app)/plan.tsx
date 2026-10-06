import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import I from '../../components/Icon';
import Screen from '../../components/Screen';
import { CatDot, DateField, Meter, Photo, Tag } from '../../components/forms';
import { Btn, BtnText, Card, CardHead, CardSub, CardTitle, ConfirmX, Empty, Field, Input, LinkBtn, MoneyInput, Note, PageHead, Pill, Select, Sheet, SheetActions, Small, Txt, moneyText, tabular } from '../../components/ui';
import { amountOf } from '../../lib/money/calc';
import { addDays, addMonths, diffDays, monthLabel, monthName, monthOf, monthStart, short, todayIn } from '../../lib/money/dates';
import { exact, money } from '../../lib/money/format';
import { jarAccrued, saveSuggestion, type Forecast } from '../../lib/money/forecast';
import { personalInflation } from '../../lib/money/inflation';
import { TAGS, planWindow } from '../../lib/money/plan';
import { affordableFrom, PRIORITIES } from '../../lib/money/wish';
import { WISH_PATHS, wishIcon } from '../../lib/money/wish-icons';
import { useShell } from '../../lib/shell-context';
import { useTheme } from '../../lib/theme-context';
import type { EventRow, Money, PlanData, TodoRow, WishRow } from '../../lib/types';
import { usePage, useRunner } from '../../lib/use-page';
import Svg, { Path } from 'react-native-svg';
import { PhotoField, photoForm, type PhotoValue } from '../../components/forms';

type Run = (name: string, payload?: { form?: Record<string, unknown>; args?: unknown[] }) => Promise<boolean>;
const asFc = (e: EventRow) => ({ id: e.id, name: e.name, date: e.date, cost: e.cost, saveMonthly: e.saveMonthly, saveFrom: e.saveFrom, source: e.source });

export default function PlanScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ new?: string; event?: string; wish?: string; calendar?: string; at?: string }>();
  const { refreshShell } = useShell();
  const { data, error, loading, reload } = usePage<PlanData>('plan', 366);
  const { run, busy } = useRunner(async () => {
    await Promise.all([reload(), refreshShell()]);
  });
  const [eventId, setEventId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [wishOpen, setWishOpen] = useState(false);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [scrollTo, setScrollTo] = useState<number | null>(null);

  useEffect(() => {
    if (params.new) setAdding(true);
    if (params.event) setEventId(params.event);
    if (params.wish) setWishOpen(true);
    if (params.calendar) setCalendarOpen(true);
  }, [params.new, params.event, params.wish, params.calendar]);
  // Links like /plan#todo scroll to that section.
  useEffect(() => {
    if (params.at && offsets[params.at] !== undefined) setScrollTo(offsets[params.at]!);
  }, [params.at, offsets]);

  if (!data) return <Screen error={error} loading={loading} onRefresh={reload} refreshing={false}>{null}</Screen>;
  const money_ = data.money;
  const { me, events, entries, cats, forecast } = money_;
  const cur = me.currency;
  const m = (n: number) => money(n, cur);
  const { to } = planWindow(me.today);
  const upcoming = events.filter((e) => !e.hidden && e.date > me.today && e.date <= to);
  const jars = events.filter((e) => !e.hidden && e.saveMonthly && e.date > me.today);
  const monthly = jars.reduce((s, e) => s + e.saveMonthly!, 0);

  const catName = new Map(cats.map((x) => [x.id, x.name]));
  const inflation = personalInflation(
    entries.map((e) => ({ date: e.date, amount: e.amount, note: e.note, category: e.categoryId ? (catName.get(e.categoryId) ?? 'Other') : 'Other' })),
    me.today,
  );
  const open = eventId ? events.find((e) => e.id === eventId) : undefined;
  const mark = (key: string) => ({ onLayout: (e: { nativeEvent: { layout: { y: number } } }) => setOffsets((o) => (o[key] === e.nativeEvent.layout.y ? o : { ...o, [key]: e.nativeEvent.layout.y })) });

  return (
    <Screen error={error} onRefresh={reload} refreshing={false} scrollToY={scrollTo}>
      <PageHead
        title="Plan ahead"
        sub={me.calendarUrl ? 'Connected to your calendar' : 'Costs before they happen'}
        icon="cal"
        right={
          <>
            {me.calendarUrl ? (
              <Pill icon="cal" onPress={() => void run('syncCalendarAction')}>
                {busy ? 'Reading the next 6 months…' : 'Google Calendar · read again'}
              </Pill>
            ) : (
              <Pill icon="link" onPress={() => setCalendarOpen(true)}>
                Connect calendar
              </Pill>
            )}
            <Btn small onPress={() => setAdding(true)}>
              <I d="plus" size={14} stroke={2.6} color={c.onB} />
              <BtnText small>Add a cost</BtnText>
            </Btn>
          </>
        }
      />

      <Card>
        <CardHead>
          <CardTitle>{me.calendarUrl ? 'Costs on your calendar' : 'Costs coming up'}</CardTitle>
          <CardSub>Next 6 months</CardSub>
        </CardHead>
        {upcoming.length === 0 && (
          <Empty>
            <Txt style={{ fontWeight: '700' }}>Nothing planned yet.</Txt>
            <Txt style={{ color: c.muted }}>{me.calendarUrl ? 'No events that cost money in the next 6 months. Add one yourself, or read the calendar again after adding events.' : 'Connect your calendar and Pursecast finds weddings, trips and birthdays, prices them and helps you save before they arrive. Or add a cost yourself.'}</Txt>
          </Empty>
        )}
        {upcoming.map((e) => {
          const saving = Boolean(e.saveMonthly);
          return (
            <Pressable key={e.id} onPress={() => setEventId(e.id)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1, borderColor: saving ? c.warnLine : 'transparent', borderRadius: 13, backgroundColor: saving ? c.warnBg : 'transparent' }}>
              <View style={{ width: 48, paddingVertical: 5, alignItems: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.card }}>
                <Txt style={{ fontSize: 18, lineHeight: 20, fontWeight: '700' }}>{Number(e.date.slice(8, 10))}</Txt>
                <Txt style={{ color: c.b, fontSize: 10.5, lineHeight: 12, fontWeight: '800', textTransform: 'uppercase' }}>{monthName(monthOf(e.date))}</Txt>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt style={{ fontWeight: '700' }} numberOfLines={1}>
                  {e.name}
                </Txt>
                <Small>
                  {saving ? `${m(e.saveMonthly!)} / month set aside` : e.tag}
                  {e.source === 'calendar' ? ' · calendar' : ''}
                </Small>
              </View>
              <View style={{ paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, backgroundColor: c.bt }}>
                <Txt style={[{ color: c.b, fontWeight: '800' }, tabular]}>~{m(e.cost)}</Txt>
              </View>
            </Pressable>
          );
        })}
        {me.calendarUrl && (
          <Pressable onPress={() => void run('disconnectCalendarAction')}>
            <Txt style={{ color: c.muted, fontWeight: '600', fontSize: 13 }}>
              Disconnect calendar
              {me.calendarAt ? ` · last read ${short(todayIn(me.timezone, new Date(me.calendarAt)))}` : ''}
            </Txt>
          </Pressable>
        )}
      </Card>

      <Card>
        <CardTitle>Set aside each month</CardTitle>
        <Txt style={[{ fontSize: 32, lineHeight: 35, fontWeight: '800', letterSpacing: -0.96 }, tabular]}>{m(monthly)}</Txt>
        {jars.length === 0 && <Note>Open a cost and tap Start saving to pay for it a little each month.</Note>}
        {jars.map((e, i) => {
          const pctSaved = Math.round((jarAccrued(asFc(e), me.today) / e.cost) * 100);
          return (
            <View key={e.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <I d="jar" size={15} color={c.ink} />
                <Txt style={{ fontSize: 13, fontWeight: '600', flex: 1 }}>{e.name}</Txt>
                <Txt style={{ fontSize: 13, fontWeight: '700' }}>{pctSaved}%</Txt>
              </View>
              <Meter pct={pctSaved} color={i % 2 ? c.b : c.sun} />
            </View>
          );
        })}
      </Card>
      <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.bt, alignItems: 'center', justifyContent: 'center' }}>
          <I d="trend" size={20} color={c.b} />
        </View>
        <View style={{ flex: 1 }}>
          <Small>Your personal inflation</Small>
          {inflation.rate !== null ? (
            <>
              <Txt style={{ fontSize: 22, lineHeight: 28, fontWeight: '700' }}>
                {inflation.rate.toFixed(1)}% {Number.isFinite(data.national) && data.national > 0 ? <Txt style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>vs {data.national.toFixed(1)}% national</Txt> : null}
              </Txt>
              <Small>
                From {inflation.items} things you buy again and again
                {inflation.drivers.length ? `. ${inflation.drivers.join(' and ')} drove it.` : '.'}
              </Small>
            </>
          ) : (
            <>
              <Txt style={{ fontSize: 16, fontWeight: '700' }}>Measuring…</Txt>
              <Small>Needs the same purchases a year apart. {inflation.items} found so far.</Small>
            </>
          )}
        </View>
      </Card>

      <View {...mark('todo')}>
        <MoneyLands data={data} run={run} />
      </View>
      <View {...mark('want')}>
        <WantToBuy data={data} fc={forecast} events={events} run={run} busy={busy} openNew={wishOpen} onClosed={() => setWishOpen(false)} />
      </View>

      {open && !editing && <EventSheet event={open} currency={cur} today={me.today} onClose={() => setEventId(null)} onEdit={() => setEditing(true)} run={run} busy={busy} />}
      <Sheet open={Boolean(open) && editing} onClose={() => setEditing(false)} title={`Edit ${open?.name ?? ''}`}>
        {open && <EventForm event={open} currency={cur} today={me.today} run={run} busy={busy} onDone={() => (setEditing(false), setEventId(null))} />}
      </Sheet>
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a cost" sub="Leave the prices empty and Pursecast estimates them from the name.">
        <EventForm currency={cur} today={me.today} run={run} busy={busy} onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={calendarOpen} onClose={() => setCalendarOpen(false)} title="Connect your calendar" sub="Plan ahead reads the next 6 months.">
        <View style={{ gap: 4 }}>
          {['Open Google Calendar on a computer, then Settings.', 'Pick your calendar under “Settings for my calendars”, then “Integrate calendar”.', 'Copy the “Secret address in iCal format” and paste it here.'].map((t, i) => (
            <Note key={i} style={{ lineHeight: 22 }}>{`${i + 1}. ${t}`}</Note>
          ))}
        </View>
        <Input value={calendarUrl} onChangeText={setCalendarUrl} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" keyboardType="url" autoCapitalize="none" autoCorrect={false} autoFocus accessibilityLabel="Secret iCal address" />
        <Note>Pursecast only reads events. It keeps ones that cost money, like weddings, trips, birthdays and appointments, and prices them. Outlook and Apple calendars work the same way.</Note>
        <SheetActions>
          <Btn variant="ghost" onPress={() => setCalendarOpen(false)}>
            Cancel
          </Btn>
          <Btn
            style={{ flex: 1 }}
            busy={busy}
            onPress={async () => {
              if (await run('connectCalendarAction', { form: { url: calendarUrl } })) setCalendarOpen(false);
            }}
          >
            {busy ? 'Reading the next 6 months…' : 'Connect'}
          </Btn>
        </SheetActions>
      </Sheet>
    </Screen>
  );
}

function EventSheet({ event: e, currency, today, onClose, onEdit, run, busy }: { event: EventRow; currency: string; today: string; onClose: () => void; onEdit: () => void; run: Run; busy: boolean }) {
  const { c } = useTheme();
  const mm = (n: number) => money(n, currency);
  const s = saveSuggestion(e.cost, today, e.date);
  const saved = jarAccrued(asFc(e), today);
  return (
    <Sheet open onClose={onClose} title={`${e.name} · ${short(e.date)}`} sub={`${e.tag}${e.source === 'calendar' ? ' · from your calendar' : ''}`}>
      <View style={{ gap: 9, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 13, backgroundColor: c.bt }}>
        {e.items.map((i) => (
          <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt style={{ flex: 1, fontWeight: '600' }}>{i.name}</Txt>
            <Txt style={[{ fontWeight: '700' }, tabular]}>{mm(i.amount)}</Txt>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(15,122,99,0.2)', paddingTop: 8 }}>
          <Txt style={{ flex: 1, fontWeight: '600' }}>In total</Txt>
          <Txt style={[{ fontWeight: '700' }, tabular]}>~{mm(e.cost)}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: c.warnLine, borderRadius: 13, backgroundColor: c.warnBg }}>
        <I d="jar" size={18} color="#d97706" />
        {e.saveMonthly ? (
          <Txt style={{ flex: 1 }}>
            Setting aside <Txt style={{ fontWeight: '700' }}>{mm(e.saveMonthly)} a month</Txt>. {mm(saved)} saved so far ({Math.round((saved / e.cost) * 100)}%).
          </Txt>
        ) : (
          <Txt style={{ flex: 1 }}>
            Put aside <Txt style={{ fontWeight: '700' }}>{mm(s.monthly)} a month</Txt> {s.months > 1 ? `until ${monthLabel(monthOf(e.date), today)}` : 'this month'} and it's paid before {e.tag === 'Travel' || e.tag === 'Wedding' ? 'you pack' : 'it arrives'}.
          </Txt>
        )}
      </View>
      <SheetActions>
        <Btn variant="ghost" onPress={onEdit}>
          Edit
        </Btn>
        {e.saveMonthly ? (
          <Btn
            variant="ghost"
            style={{ flex: 1 }}
            busy={busy}
            onPress={async () => {
              if (await run('stopSavingAction', { form: { id: e.id } })) onClose();
            }}
          >
            Stop saving
          </Btn>
        ) : (
          <Btn
            style={{ flex: 1 }}
            busy={busy}
            onPress={async () => {
              if (await run('startSavingAction', { form: { id: e.id, monthly: String(s.monthly / 100) } })) onClose();
            }}
          >
            Start saving
          </Btn>
        )}
      </SheetActions>
      <Pressable
        onPress={async () => {
          if (await run('hideEventAction', { form: { id: e.id } })) onClose();
        }}
      >
        <Txt style={{ color: c.muted, fontWeight: '600', fontSize: 13 }}>This won't cost me anything · remove</Txt>
      </Pressable>
    </Sheet>
  );
}

function EventForm({ event, currency, today, run, busy, onDone }: { event?: EventRow; currency: string; today: string; run: Run; busy: boolean; onDone: () => void }) {
  const slots = Math.max(1, 5 - (event?.items.length ?? 0)) + (event?.items.length ?? 0);
  const [name, setName] = useState(event?.name ?? '');
  const [date, setDate] = useState(event?.date ?? '');
  const [tag, setTag] = useState(event?.tag ?? 'Other');
  const [location, setLocation] = useState('');
  const [items, setItems] = useState(() => Array.from({ length: slots }, (_, i) => ({ name: event?.items[i]?.name ?? '', amount: event?.items[i] ? moneyText(event.items[i]!.amount) : '' })));
  const save = async () => {
    const form: Record<string, unknown> = { ...(event ? { id: event.id } : { location }), name, date, tag };
    items.forEach((it, i) => {
      form[`itemName${i}`] = it.name;
      form[`itemAmount${i}`] = it.amount;
    });
    if (await run('saveEventAction', { form })) onDone();
  };
  return (
    <>
      <Field label="What is it">
        <Input value={name} onChangeText={setName} placeholder="Anna & Jon's wedding" autoFocus={!event} maxLength={120} />
      </Field>
      <Field label="Date">
        <DateField value={date} onChange={setDate} min={today} label="Date" />
      </Field>
      <Field label="Kind">
        <Select value={tag} onChange={setTag} label="Kind" options={TAGS.map((t) => ({ id: t, label: t }))} />
      </Field>
      {!event && (
        <Field label="Where (optional, adds travel)">
          <Input value={location} onChangeText={setLocation} placeholder="Porto" />
        </Field>
      )}
      <Field label="What it will cost">
        {items.map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Input value={it.name} onChangeText={(v) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, name: v } : x)))} placeholder={['Flights', 'Hotel', 'Outfit', 'Gift', 'Other'][i]} accessibilityLabel={`Cost ${i + 1}`} />
            </View>
            <View style={{ flex: 1 }}>
              <MoneyInput currency={currency} value={it.amount} onChangeText={(v) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, amount: v } : x)))} label={`Cost ${i + 1} amount`} />
            </View>
          </View>
        ))}
      </Field>
      <SheetActions>
        <Btn variant="ghost" onPress={onDone}>
          Cancel
        </Btn>
        <Btn style={{ flex: 1 }} busy={busy} onPress={save}>
          {event ? 'Save' : 'Add to plan'}
        </Btn>
      </SheetActions>
    </>
  );
}

/* ---------- When money lands ---------- */

const KEEP_DONE_DAYS = 3;
const weekday = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
type Group = { key: string; due: string; landed: boolean; pay: number | null; title: string; sub: string; items: Array<{ id: string; text: string; amount: number | null; done: boolean; priority: number }> };
const TODO_PRIORITIES: Array<[number, string]> = [
  [1, 'Must do'],
  [2, 'Should do'],
  [3, 'Nice to do'],
];

// "When money lands": things to do once a pay arrives.
function MoneyLands({ data, run }: { data: PlanData; run: Run }) {
  const { c } = useTheme();
  const { me, recurring } = data.money;
  const [override, setOverride] = useState<Record<string, boolean>>({});
  const [text, setText] = useState('');
  const [amount, setAmount] = useState('');
  const [priority, setPriority] = useState('2');
  const [picked, setPicked] = useState('');
  const [problem, setProblem] = useState('');
  const since = addDays(me.today, -KEEP_DONE_DAYS);
  const todos = data.todos.filter((t) => !t.doneAt || t.doneAt.slice(0, 10) >= since);
  const incomes = recurring.filter((r) => r.amount > 0 && !r.paused);
  const byId = new Map(recurring.map((r) => [r.id, r]));

  const groups = new Map<string, Group>();
  for (const t of todos) {
    const income = t.incomeId ? byId.get(t.incomeId) : undefined;
    const key = income ? `${income.id}|${t.due}` : t.due <= me.today ? 'now' : `date|${t.due}`;
    let g = groups.get(key);
    if (!g) {
      const landed = t.due <= me.today;
      const name = income?.name ?? 'Money in';
      const days = diffDays(me.today, t.due);
      g = income
        ? { key, due: t.due, landed, pay: income.amount, title: landed ? `${name} is in` : `When ${name} lands`, sub: landed ? `Landed ${short(t.due)} · time to do these` : `${short(t.due)} · ${days === 1 ? 'tomorrow' : `in ${days} days`}`, items: [] }
        : key === 'now'
          ? { key, due: '', landed: true, pay: null, title: 'Right now', sub: 'Money that is already here', items: [] }
          : { key, due: t.due, landed: false, pay: null, title: `By ${weekday(t.due)} ${short(t.due)}`, sub: days === 1 ? 'Tomorrow' : `In ${days} days`, items: [] };
      groups.set(key, g);
    }
    g.items.push({ id: t.id, text: t.text, amount: t.amount, done: override[t.id] ?? Boolean(t.doneAt), priority: t.priority });
  }
  // Money that has landed first, then the next paydays in order.
  const list = [...groups.values()].sort((a, b) => Number(b.landed) - Number(a.landed) || a.due.localeCompare(b.due));

  // Paydays first, then plain dates; "On a date…" is added by the list.
  const dow = new Date(`${me.today}T00:00:00Z`).getUTCDay();
  const weekend = dow === 0 || dow === 6 ? me.today : addDays(me.today, 6 - dow);
  const nextMonth = monthStart(addMonths(me.today, 1));
  const options = [
    ...incomes.map((r) => ({ id: `${r.id}|${r.nextDate}`, label: `When ${r.name} lands · ${short(r.nextDate)}` })),
    { id: 'now', label: 'Right now' },
    { id: `date|${weekend}`, label: `This weekend · ${weekday(weekend)} ${short(weekend)}` },
    { id: `date|${nextMonth}`, label: `Next month · ${short(nextMonth)}` },
    { id: 'pick', label: 'On a date…' },
  ];
  const [when, setWhen] = useState(options[0]!.id);
  const waiting = list.filter((g) => !g.landed).reduce((s, g) => s + g.items.filter((i) => !i.done).length, 0);

  const add = async () => {
    setProblem('');
    if (!text.trim()) return setProblem('Write what to do.');
    if (when === 'pick' && !picked) return setProblem('Pick a date.');
    const ok = await run('addTodoAction', { form: { text, amount, when, priority, ...(when === 'pick' ? { date: picked } : {}) } });
    if (ok) {
      setText('');
      setAmount('');
      setPicked('');
      setWhen(options[0]!.id);
    }
  };

  return (
    <Card>
      <CardHead>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <I d="wallet" size={16} color={c.ink} />
            <CardTitle>When money lands</CardTitle>
          </View>
          <CardSub>
            A to-do list for payday and the days ahead. {waiting ? `${waiting} waiting · ` : ''}
            {incomes[0] ? `Next pay ${short(incomes[0].nextDate)}` : 'Add your pay in setup to plan for it.'}
          </CardSub>
        </View>
      </CardHead>
      <View style={{ gap: 14 }}>
        <View style={{ gap: 8 }}>
          <Input value={text} onChangeText={setText} placeholder="Pay back Sam, book the train, buy a winter coat…" maxLength={140} accessibilityLabel="What to do" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <MoneyInput currency={me.currency} value={amount} onChangeText={setAmount} placeholder="Cost" label="What it costs (optional)" />
            </View>
            <View style={{ flex: 1 }}>
              <Select value={priority} onChange={setPriority} label="Priority" options={TODO_PRIORITIES.map(([p, label]) => ({ id: String(p), label }))} />
            </View>
          </View>
          <Select value={when} onChange={setWhen} label="When" options={options} />
          {when === 'pick' && <DateField value={picked} onChange={setPicked} min={me.today} label="Date" />}
          <Btn style={{ alignSelf: 'flex-start' }} onPress={add}>
            <I d="plus" size={15} stroke={2.6} color={c.onB} />
            <BtnText>Add</BtnText>
          </Btn>
        </View>
        {problem ? <Txt style={{ color: c.neg, fontSize: 12 }}>{problem}</Txt> : null}

        {list.length === 0 && (
          <Empty>
            <Txt style={{ fontWeight: '700' }}>Nothing on the list yet.</Txt>
            <Txt style={{ color: c.muted }}>Jot down what you will do once money lands, like paying someone back or booking a ticket. Pick when, and how much it matters.</Txt>
          </Empty>
        )}

        {list.map((g) => {
          const left = g.items.filter((i) => !i.done);
          const planned = g.items.reduce((s, i) => s + (i.amount ?? 0), 0);
          const all = g.items.length > 0 && left.length === 0;
          return (
            <View key={g.key} style={{ gap: 10, padding: 14, borderWidth: 1, borderColor: g.landed ? c.line : c.line, borderRadius: 14, backgroundColor: g.landed ? c.posBg : c.card }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: g.landed ? c.posBg : c.bt, alignItems: 'center', justifyContent: 'center' }}>
                  <I d={g.landed ? 'check' : g.key.startsWith('date|') ? 'cal' : 'wallet'} size={15} stroke={2.4} color={g.landed ? c.pos : c.b} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt style={{ fontWeight: '700' }}>{g.title}</Txt>
                  <Small style={{ fontSize: 12.5 }}>{all ? 'All done' : g.sub}</Small>
                </View>
                {planned > 0 && (
                  <Txt style={[{ fontWeight: '700' }, tabular]}>
                    {exact(planned, me.currency)}
                    {g.pay ? <Txt style={{ fontWeight: '500', color: c.muted, fontSize: 12.5 }}> of {exact(g.pay, me.currency)}</Txt> : null}
                  </Txt>
                )}
              </View>
              {g.pay && planned > 0 ? <Meter pct={Math.min(100, Math.round((planned / g.pay) * 100))} color={planned > g.pay ? c.neg : c.b} /> : null}
              <View>
                {[...g.items].sort((a, b) => a.priority - b.priority).map((i, idx) => (
                  <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 38, paddingVertical: 2, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: c.line }}>
                    <Pressable
                      onPress={() => {
                        setOverride((o) => ({ ...o, [i.id]: !i.done }));
                        void run('setTodoDoneAction', { args: [i.id, !i.done] });
                      }}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: i.done }}
                      accessibilityLabel={i.text}
                      style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: i.done ? c.pos : c.line2, backgroundColor: i.done ? c.pos : c.card, alignItems: 'center', justifyContent: 'center' }}
                    >
                      {i.done ? <I d="check" size={13} stroke={3} color="#fff" /> : null}
                    </Pressable>
                    <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Txt style={{ fontWeight: '600', color: i.done ? c.muted : c.ink, textDecorationLine: i.done ? 'line-through' : 'none' }}>{i.text}</Txt>
                      {i.priority !== 2 && (
                        <View style={{ marginLeft: 8, paddingVertical: 1, paddingHorizontal: 7, borderRadius: 99, backgroundColor: i.priority === 1 ? c.negBg2 : c.soft }}>
                          <Txt style={{ fontSize: 11, fontWeight: '700', color: i.priority === 1 ? c.neg : c.muted, lineHeight: 15 }}>{i.priority === 1 ? 'Must' : 'Nice'}</Txt>
                        </View>
                      )}
                    </View>
                    {i.amount ? <Txt style={[{ fontWeight: '700', color: i.done ? c.muted : c.ink, textDecorationLine: i.done ? 'line-through' : 'none' }, tabular]}>{exact(i.amount, me.currency)}</Txt> : null}
                    <ConfirmX label={`Remove ${i.text}`} onConfirm={() => void run('deleteTodoAction', { args: [i.id] })} />
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

/* ---------- Want to buy ---------- */

// The photo if there is one, otherwise an icon that fits the name.
function Thumb({ w, ok }: { w: WishRow; ok: boolean }) {
  const { c } = useTheme();
  if (w.photo) return <Photo src={w.photo} size={48} />;
  return (
    <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: ok ? c.posBg : c.soft, alignItems: 'center', justifyContent: 'center' }}>
      <Svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={ok ? c.pos : c.ink2} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d={WISH_PATHS[wishIcon(w.name)]} />
      </Svg>
    </View>
  );
}

function WishForm({ w, currency, run, busy, onDone }: { w?: WishRow; currency: string; run: Run; busy: boolean; onDone: () => void }) {
  const [name, setName] = useState(w?.name ?? '');
  const [price, setPrice] = useState(w ? moneyText(w.price) : '');
  const [priority, setPriority] = useState(String(w?.priority ?? 2));
  const [url, setUrl] = useState(w?.url ?? '');
  const [photo, setPhoto] = useState<PhotoValue>({ photo: '', cleared: false });
  const save = async () => {
    if (await run(w ? 'updateWishAction' : 'addWishAction', { form: { ...(w ? { id: w.id } : {}), name, price, priority, url, ...photoForm(photo) } })) onDone();
  };
  return (
    <>
      <Field label="What is it">
        <Input value={name} onChangeText={setName} placeholder="Acne Studios sweater" maxLength={80} autoFocus={!w} />
      </Field>
      <Field label="Price">
        <MoneyInput currency={currency} value={price} onChangeText={setPrice} label="Price" />
      </Field>
      <Field label="How much you want it">
        <Select value={priority} onChange={setPriority} label="How much you want it" options={PRIORITIES.map(([p, label]) => ({ id: String(p), label }))} />
      </Field>
      <Field label="Link (optional)">
        <Input value={url} onChangeText={setUrl} placeholder="https://" keyboardType="url" autoCapitalize="none" autoCorrect={false} maxLength={500} />
      </Field>
      <PhotoField current={w?.photo} value={photo} onChange={setPhoto} label="Photo (optional)" />
      <SheetActions>
        <Btn variant="ghost" onPress={onDone}>
          Cancel
        </Btn>
        <Btn style={{ flex: 1 }} busy={busy} onPress={save}>
          {w ? 'Save' : 'Add to list'}
        </Btn>
      </SheetActions>
    </>
  );
}

function WishRowView({ w, me, fc, events, dips, run, busy }: { w: WishRow; me: Money['me']; fc: Forecast; events: EventRow[]; dips: boolean; run: Run; busy: boolean }) {
  const { c } = useTheme();
  const cur = me.currency;
  const [saving, setSaving] = useState(false);
  const [bought, setBought] = useState(false);
  const [edit, setEdit] = useState(false);
  const from = affordableFrom(fc, w.price);
  const ev = w.eventId ? events.find((e) => e.id === w.eventId) : undefined;
  const saved = ev ? jarAccrued(asFc(ev), me.today) : 0;
  const pct = ev ? Math.round((saved / w.price) * 100) : 0;
  const now = from === me.today;
  const label = ev ? `Saving · ${pct}% by ${short(ev.date)}` : now ? 'You can afford it now' : from ? `Fits from ${short(from)} · in ${diffDays(me.today, from)} days` : dips ? `After the storm on ${short(fc.low.date)} is fixed` : 'Not within the next year';
  const [by, setBy] = useState(from && from > me.today ? from : addMonths(me.today, 3));
  const [paid, setPaid] = useState(moneyText(w.price));
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.line }}>
      <Thumb w={w} ok={now} />
      <View style={{ flex: 1, minWidth: 160 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <Txt style={{ fontWeight: '700' }} onPress={w.url ? () => void Linking.openURL(w.url!) : undefined}>
            {w.name}
          </Txt>
          <Tag>{PRIORITIES.find(([p]) => p === w.priority)?.[1] ?? ''}</Tag>
        </View>
        <Small style={now ? { color: c.pos } : undefined}>{label}</Small>
        {ev && (
          <View style={{ marginTop: 6, maxWidth: 220 }}>
            <Meter pct={pct} color={c.sun} />
          </View>
        )}
      </View>
      <Txt style={[{ fontWeight: '700' }, tabular]}>{exact(w.price, cur)}</Txt>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        {!ev && !now && (
          <Btn variant="ghost" small onPress={() => setSaving(true)}>
            Save for it
          </Btn>
        )}
        <Btn variant="ghost" small onPress={() => setBought(true)}>
          Bought it
        </Btn>
        <Pressable onPress={() => setEdit(true)} accessibilityRole="button" accessibilityLabel={`Edit ${w.name}`} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <I d="edit" size={14} color={c.muted} />
        </Pressable>
        <ConfirmX label={`Remove ${w.name}`} icon="trash" onConfirm={() => void run('deleteWishAction', { form: { id: w.id } })} />
      </View>

      <Sheet open={saving} onClose={() => setSaving(false)} title={`Save for ${w.name}`} sub="A little each month, so it is paid before you buy it.">
        <Field label="Buy it by">
          <DateField value={by} onChange={setBy} min={me.today} label="Buy it by" />
        </Field>
        <SheetActions>
          <Btn variant="ghost" onPress={() => setSaving(false)}>
            Cancel
          </Btn>
          <Btn
            style={{ flex: 1 }}
            busy={busy}
            onPress={async () => {
              if (await run('saveForWishAction', { form: { id: w.id, by } })) setSaving(false);
            }}
          >
            Start saving
          </Btn>
        </SheetActions>
      </Sheet>
      <Sheet open={bought} onClose={() => setBought(false)} title={`You bought ${w.name}`} sub="It is logged in Spending as shopping.">
        <Field label="What it cost">
          <MoneyInput currency={cur} value={paid} onChangeText={setPaid} autoFocus label="What it cost" />
        </Field>
        <SheetActions>
          <Btn variant="ghost" onPress={() => setBought(false)}>
            Cancel
          </Btn>
          <Btn
            style={{ flex: 1 }}
            busy={busy}
            onPress={async () => {
              if (await run('boughtWishAction', { form: { id: w.id, price: paid } })) setBought(false);
            }}
          >
            Log it
          </Btn>
        </SheetActions>
      </Sheet>
      <Sheet open={edit} onClose={() => setEdit(false)} title={`Edit ${w.name}`}>
        <WishForm w={w} currency={cur} run={run} busy={busy} onDone={() => setEdit(false)} />
      </Sheet>
    </View>
  );
}

// Things the person wants to buy, each with the first day it fits the
// forecast without a storm afterwards.
function WantToBuy({ data, fc, events, run, busy, openNew, onClosed }: { data: PlanData; fc: Forecast; events: EventRow[]; run: Run; busy: boolean; openNew: boolean; onClosed: () => void }) {
  const { c } = useTheme();
  const router = useRouter();
  const { me } = data.money;
  const cur = me.currency;
  const [adding, setAdding] = useState(openNew);
  useEffect(() => {
    if (openNew) setAdding(true);
  }, [openNew]);
  const wanted = data.wishes.filter((w) => !w.boughtAt);
  const bought = data.wishes.filter((w) => w.boughtAt).slice(-5);
  const total = wanted.reduce((s, w) => s + w.price, 0);
  // When nothing fits, the forecast itself is the reason: say where it dips.
  const dips = fc.low.amount < fc.cushion;
  return (
    <Card>
      <CardHead>
        <View style={{ flex: 1 }}>
          <CardTitle>Want to buy</CardTitle>
          <CardSub>{wanted.length ? `${wanted.length} ${wanted.length === 1 ? 'thing' : 'things'} · ${money(total, cur)} in total` : 'Add what you want and see the first day it fits your forecast.'}</CardSub>
        </View>
        <Btn small onPress={() => setAdding(true)}>
          <I d="plus" size={14} stroke={2.6} color={c.onB} />
          <BtnText small>Add</BtnText>
        </Btn>
      </CardHead>

      {wanted.some((w) => !affordableFrom(fc, w.price)) && dips && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: c.warnLine, borderRadius: 13, backgroundColor: c.warnBg }}>
          <I d="storm" size={18} color="#d97706" />
          <Txt style={{ flex: 1 }}>
            Your forecast dips to <Txt style={{ fontWeight: '700' }}>{money(fc.low.amount, cur)}</Txt> on {short(fc.low.date)}, so nothing extra fits until that is fixed.{' '}
            <Txt onPress={() => router.navigate('/forecast')} style={{ color: c.b, fontWeight: '700' }}>
              See Money Weather
            </Txt>
          </Txt>
        </View>
      )}

      {wanted.map((w) => (
        <WishRowView key={w.id} w={w} me={me} fc={fc} events={events} dips={dips} run={run} busy={busy} />
      ))}
      {bought.length > 0 && <Note>Bought lately: {bought.map((w) => w.name).join(', ')}</Note>}

      <Sheet
        open={adding}
        onClose={() => {
          setAdding(false);
          onClosed();
        }}
        title="Something you want to buy"
      >
        <WishForm currency={cur} run={run} busy={busy} onDone={() => (setAdding(false), onClosed())} />
      </Sheet>
    </Card>
  );
}
