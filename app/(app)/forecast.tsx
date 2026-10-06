import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Chart, Dot, Lines, ZeroLine, px } from '../../components/Chart';
import Grad from '../../components/Grad';
import I from '../../components/Icon';
import Screen from '../../components/Screen';
import { CONDITION, SkyIcon, SkyInline } from '../../components/Sky';
import { Btn, Card, CardHead, CardTitle, Field, LinkBtn, MoneyInput, PageHead, Pill, Segment, Sheet, SheetActions, SignToggle, Small, Note, TipCard, Txt, moneyText, tabular } from '../../components/ui';
import { VB } from '../../lib/chart';
import { addDays, addMonths, countWord, diffDays, monthName, monthOf, range, short } from '../../lib/money/dates';
import { conditionOf, everyday, monthsOfForecast, nextIncomeAfter, suggestFix, sunnyUntil, weekFlows, weeksOf, worstWeek, type FcBudget, type Forecast, type Sky, type Week } from '../../lib/money/forecast';
import { exact, money } from '../../lib/money/format';
import { useShell } from '../../lib/shell-context';
import { useTheme } from '../../lib/theme-context';
import type { ForecastData } from '../../lib/types';
import { usePage, useRunner } from '../../lib/use-page';

const RANGES = [
  { id: '1m', label: '1 month', words: 'month', days: 31, byMonth: false },
  { id: '3m', label: '3 months', words: '3 months', days: 91, byMonth: false },
  { id: '6m', label: '6 months', words: '6 months', days: 183, byMonth: true },
  { id: '1y', label: '1 year', words: 'year', days: 366, byMonth: true },
] as const;

function list(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

// The forecast seen through one calendar month: its days, and the lowest
// point within them.
function focusMonth(fc: Forecast, month: string): Forecast {
  const days = fc.days.filter((d) => monthOf(d.date) === month);
  if (!days.length) return fc;
  let low = days[0]!;
  for (const d of days) if (d.spendable < low.spendable) low = d;
  return { ...fc, days, low: { date: low.date, amount: low.spendable } };
}

const B = ({ children }: { children: ReactNode }) => <Txt style={{ fontWeight: '700' }}>{children}</Txt>;

export default function ForecastScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ balance?: string }>();
  const { refreshShell } = useShell();
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]['id']>('3m');
  const [month, setMonth] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<string | null>(null);
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [cushionOpen, setCushionOpen] = useState(false);

  const view = RANGES.find((r) => r.id === rangeId)!;
  const [today, setToday] = useState<string | null>(null);
  // The 1 month view is one calendar month, chosen with the arrows (this
  // month and the 11 after it); the forecast runs to its last day.
  const months = useMemo(() => (today ? Array.from({ length: 12 }, (_, i) => monthOf(addMonths(`${monthOf(today)}-01`, i))) : []), [today]);
  const focus = view.id === '1m' && months.length ? (month && months.includes(month) ? month : months[0]!) : null;
  const focusEnd = focus ? addDays(addMonths(`${focus}-01`, 1), -1) : null;
  const days = today && focusEnd ? diffDays(today, focusEnd) + 1 : view.days;

  const { data, error, loading, reload } = usePage<ForecastData>('forecast', days);
  const { run, busy } = useRunner(async () => {
    await Promise.all([reload(), refreshShell()]);
  });

  useEffect(() => {
    if (data) setToday(data.money.me.today);
  }, [data]);
  useEffect(() => {
    if (params.balance) setBalanceOpen(true);
  }, [params.balance]);

  if (!data) return <Screen error={error} loading={loading} onRefresh={reload} refreshing={false}>{null}</Screen>;

  const { me, budgets, balance, mainBalance, mainName, accounts } = data.money;
  const loaded = data.money.forecast;
  const fc = focus ? focusMonth(loaded, focus) : loaded;
  // Things waiting for a payday, shown on that pay in Coming up.
  const toDo = new Map<string, number>();
  for (const t of data.todos) toDo.set(`${t.incomeId}|${t.due}`, (toDo.get(`${t.incomeId}|${t.due}`) ?? 0) + 1);
  const cur = me.currency;
  const m = (n: number, sign = false) => money(n, cur, { sign });
  // Weeks for the short views, calendar months for the long ones.
  const weeks = view.byMonth ? monthsOfForecast(fc) : focus ? weeksOf({ ...fc, today: fc.days[0]!.date }, 6) : weeksOf(fc, Math.ceil(view.days / 7) + 1);
  // How the chosen period is named in sentences.
  const period = focus ? (focus === months[0] ? 'the rest of this month' : monthName(focus, true)) : `the next ${view.words}`;
  const condition = conditionOf(fc);
  const worst = worstWeek(weeks);
  const sunny = sunnyUntil(weeks);
  const namesIn = (w: Week) => weekFlows(w).filter((f) => f.amount < 0 && f.kind !== 'jar').map((f) => f.name);

  let tip: ReactNode;
  if (worst?.sky === 'storm') {
    const names = namesIn(worst).slice(0, 3);
    tip = (
      <>
        {sunny && (
          <B>
            <SkyInline sky="sun" /> Sunny through {short(sunny)}.{' '}
          </B>
        )}
        <SkyInline sky="storm" /> Storm warning {view.byMonth ? `in ${monthName(monthOf(worst.start), true)}` : `for the week of ${short(worst.start)}`}:{' '}
        {names.length >= 2 ? `${list(names)} land together.` : names.length === 1 ? `${names[0]} and everyday spending take you below zero.` : 'everyday spending takes you below zero.'}
      </>
    );
  } else if (worst?.sky === 'cloud') {
    const payday = nextIncomeAfter(fc, worst.lowDate);
    tip = (
      <>
        <B>
          <SkyInline sky="cloud" /> {view.byMonth ? monthName(monthOf(worst.start), true) : `Week of ${short(worst.start)}`} is tight but covered.
        </B>
        {payday ? ` Sunny again from payday on ${short(payday.date)}.` : ` Lowest point ${m(worst.low)} on ${short(worst.lowDate)}.`}
      </>
    );
  } else {
    tip = (
      <>
        <B>
          <SkyInline sky={condition === 'sun' ? 'sun' : 'partly'} /> {condition === 'sun' ? `Sunny for ${period}.` : `Mostly sunny for ${period}.`}
        </B>{' '}
        Your lowest point is {m(fc.low.amount)} on {short(fc.low.date)}.
      </>
    );
  }

  // Chart
  const values = fc.days.map((d) => d.spendable);
  const lo = Math.min(0, ...values);
  const hi = Math.max(1, ...values);
  const pad = (hi - lo) * 0.14 || 100;
  const [min, max] = [lo - pad, hi + pad];
  const pts = fc.days.map((d, i): [number, number] => [(i / (fc.days.length - 1)) * VB.w, VB.h - ((d.spendable - min) / (max - min)) * VB.h]);
  const lowIndex = fc.days.findIndex((d) => d.date === fc.low.date);
  const zeroY = VB.h - ((0 - min) / (max - min)) * VB.h;
  const monthTicks = fc.days.map((d, i) => ({ d, i })).filter(({ d, i }) => i === 0 || (d.date.endsWith('-01') && i > 6));

  const coming = fc.days
    .flatMap((d) => d.flows.filter((f) => f.kind !== 'jar').map((f) => ({ ...f, date: d.date })))
    .filter((f) => diffDays(me.today, f.date) <= 45)
    .slice(0, 6);

  const openWeek = weekStart ? weeks.find((w) => w.start === weekStart) : undefined;
  const lowWeek = worst ? worst.start : (weeks.find((w) => w.lowDate === fc.low.date)?.start ?? weeks[0]?.start);

  const pickRange = (id: (typeof RANGES)[number]['id']) => {
    setRangeId(id);
    setMonth(null);
  };

  return (
    <Screen error={error} onRefresh={reload} refreshing={false}>
      <PageHead
        title="Money Weather"
        sub={focus ? `${monthName(focus, true)} ${focus.slice(0, 4)}` : `Next ${view.words}`}
        icon="sun"
        right={<Pill onPress={() => setCushionOpen(true)}>{`Cushion ${m(me.cushion)}`}</Pill>}
      />

      <Card style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Small>{accounts.some((a) => a.inForecast) ? 'Balance today, all counted accounts' : 'Balance today'}</Small>
          <Txt style={[{ fontSize: 32, lineHeight: 35, fontWeight: '800', letterSpacing: -0.96 }, tabular]}>{Math.abs(balance) < 10000 ? exact(balance, me.currency) : m(balance)}</Txt>
          {accounts.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, marginTop: 2, marginBottom: 4 }}>
              <Txt style={[{ color: c.muted, fontSize: 12.5 }, tabular]}>
                {mainName} {exact(mainBalance, me.currency)}
              </Txt>
              {accounts
                .filter((a) => a.balance !== 0)
                .map((a) => (
                  <Txt key={a.id} style={[{ color: c.muted, fontSize: 12.5, opacity: a.inForecast ? 1 : 0.65 }, tabular]}>
                    {a.name} {exact(a.balance, a.currency)}
                    {a.currency !== me.currency ? ` ≈ ${m(a.value)}` : ''}
                    {a.inForecast ? '' : ' (not counted)'}
                  </Txt>
                ))}
            </View>
          )}
          <Small>
            {fc.reserved > 0 ? `${m(fc.reserved)} set aside for plans · ` : ''}
            <Txt onPress={() => setBalanceOpen(true)} style={{ color: c.b, fontWeight: '700', fontSize: 12 }}>
              Update
            </Txt>
          </Small>
        </View>
        <Pressable onPress={() => setWeekStart(lowWeek ?? null)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingLeft: 9, paddingRight: 14, borderRadius: 13, backgroundColor: c.bg }}>
          <View style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
            <SkyIcon sky={condition} size={24} />
          </View>
          <View>
            <Txt style={{ fontWeight: '700' }}>{CONDITION[condition]}</Txt>
            <Small>
              Lowest point <Txt style={{ color: fc.low.amount < 0 ? c.neg : c.pos, fontSize: 12 }}>{m(fc.low.amount)}</Txt> · {short(fc.low.date)}
            </Small>
          </View>
        </Pressable>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Segment options={RANGES.map((r) => ({ id: r.id, label: r.label }))} value={rangeId} onChange={pickRange} />
        {focus && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderWidth: 1, borderColor: c.line, borderRadius: 12, backgroundColor: c.card }}>
            <Pressable disabled={months.indexOf(focus) <= 0} onPress={() => setMonth(months[months.indexOf(focus) - 1]!)} accessibilityLabel="Previous month" style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', opacity: months.indexOf(focus) > 0 ? 1 : 0.3 }}>
              <I d="left" size={16} color={c.ink} />
            </Pressable>
            <Txt style={{ minWidth: 140, textAlign: 'center', fontWeight: '700' }}>
              {monthName(focus, true)} {focus.slice(0, 4)}
            </Txt>
            <Pressable disabled={months.indexOf(focus) >= months.length - 1} onPress={() => setMonth(months[months.indexOf(focus) + 1]!)} accessibilityLabel="Next month" style={{ width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center', opacity: months.indexOf(focus) < months.length - 1 ? 1 : 0.3 }}>
              <I d="right" size={16} color={c.ink} />
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, paddingBottom: 4 }}>
        {weeks.map((w, i) => {
          const body = (
            <>
              <Txt style={{ color: c.muted, fontSize: 11 }} numberOfLines={1}>
                {view.byMonth ? (i === 0 ? 'This month' : monthName(monthOf(w.start))) : i === 0 && !(focus && focus !== months[0]) ? 'This week' : short(w.start)}
              </Txt>
              <SkyIcon sky={w.sky} size={22} />
              <Txt style={[{ fontSize: 12, fontWeight: '700', color: w.sky === 'storm' ? c.neg : c.ink }, tabular]} numberOfLines={1}>
                {m(w.low)}
              </Txt>
            </>
          );
          const box = { width: 76, alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 2, borderRadius: 12, borderWidth: 1, borderColor: w.sky === 'storm' ? '#c4b5fd' : c.line } as const;
          return (
            <Pressable key={w.start} onPress={() => setWeekStart(w.start)} accessibilityRole="button" accessibilityLabel={`${view.byMonth ? monthName(monthOf(w.start), true) : `Week of ${short(w.start)}`}: ${CONDITION[w.sky]}, lowest ${m(w.low)}`}>
              {w.sky === 'sun' ? (
                <Grad from={c.warnBg} to={c.card} style={box}>
                  {body}
                </Grad>
              ) : w.sky === 'storm' ? (
                <Grad from={c.violetBg} to={c.card} style={box}>
                  {body}
                </Grad>
              ) : w.sky === 'cloud' ? (
                <Grad from={c.soft} to={c.card} style={box}>
                  {body}
                </Grad>
              ) : (
                <View style={[box, { backgroundColor: c.card }]}>{body}</View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <Card>
        <Chart height={200}>
          {(box) => {
            const low = lowIndex >= 0 ? px(pts[lowIndex]!, box) : null;
            return (
              <>
                <ZeroLine y={(zeroY / VB.h) * box.h} label={m(0)} />
                <Lines box={box} lines={[{ points: pts, color: c.b, draw: true }]} />
                {low && <Dot at={low} color={fc.low.amount < 0 ? c.neg : c.b} label={`${m(fc.low.amount)} · ${short(fc.low.date)}`} />}
              </>
            );
          }}
        </Chart>
        <View style={{ position: 'relative', height: 14, marginTop: 10 }}>
          {monthTicks.map(({ d, i }) => {
            const at = `${(i / (fc.days.length - 1)) * 100}%` as const;
            return (
              <View key={d.date} style={i === 0 ? { position: 'absolute', left: 0 } : { position: 'absolute', left: at, width: 60, marginLeft: -30, alignItems: 'center' }}>
                <Txt style={{ color: c.muted, fontSize: 11, lineHeight: 14 }}>{i === 0 ? (d.date === me.today ? 'Today' : short(d.date)) : short(d.date).split(' ')[0]}</Txt>
              </View>
            );
          })}
        </View>
      </Card>

      <TipCard>
        {tip}
        {worst && (
          <>
            {' '}
            <Txt onPress={() => setWeekStart(worst.start)} style={{ color: c.b, fontWeight: '700', fontSize: 13.5 }}>
              See the week
            </Txt>
          </>
        )}
      </TipCard>

      <Card>
        <CardHead>
          <CardTitle>Coming up</CardTitle>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <LinkBtn size={13} onPress={() => router.navigate('/spending?tab=bills&advance=1')}>
              Salary advance
            </LinkBtn>
            <LinkBtn size={13} onPress={() => router.navigate('/spending?tab=bills')}>
              Bills
            </LinkBtn>
          </View>
        </CardHead>
        {coming.length === 0 && <Note>No bills, income or plans in the next 45 days.</Note>}
        {coming.map((f) => (
          <View key={`${f.ref}${f.date}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '700' }}>{f.name}</Txt>
              <Small>
                {short(f.date)}
                {f.calendar ? ' · calendar' : ''}
                {toDo.get(`${f.ref}|${f.date}`) ? (
                  <>
                    {' · '}
                    <Txt onPress={() => router.navigate('/plan?at=todo')} style={{ color: c.b, fontWeight: '700', fontSize: 12.5 }}>
                      {toDo.get(`${f.ref}|${f.date}`)} to do when it lands
                    </Txt>
                  </>
                ) : null}
              </Small>
            </View>
            <Txt style={[{ fontWeight: '700', color: f.amount > 0 ? c.pos : c.ink }, tabular]}>{m(f.amount, true)}</Txt>
          </View>
        ))}
      </Card>

      <Card>
        <CardTitle>How this is worked out</CardTitle>
        <Note>
          Your balance, minus everyday spending from your budgets ({m(budgets.reduce((s, b) => s + b.budget, 0))} a month), plus bills and income on their dates, and planned costs from your calendar.
        </Note>
      </Card>

      {openWeek && <WeekSheet week={openWeek} fc={fc} budgets={budgets} currency={cur} onClose={() => setWeekStart(null)} onFix={(fix) => run('fixStormAction', { form: { categoryId: fix.categoryId, amount: String(fix.amount / 100), until: fix.until } }).then((ok) => ok && setWeekStart(null))} busy={busy} onBudgets={() => (setWeekStart(null), router.navigate('/spending?tab=budgets'))} />}

      <BalanceSheet open={balanceOpen} onClose={() => setBalanceOpen(false)} currency={cur} balance={balance} negative={me.balance < 0} busy={busy} onSave={(form) => run('setBalanceAction', { form }).then((ok) => ok && setBalanceOpen(false))} />
      <CushionSheet open={cushionOpen} onClose={() => setCushionOpen(false)} currency={cur} cushion={me.cushion} busy={busy} onSave={(form) => run('setCushionAction', { form }).then((ok) => ok && setCushionOpen(false))} />
    </Screen>
  );
}

function WeekSheet({ week, fc: f, budgets: b, currency, onClose, onFix, busy, onBudgets }: { week: Week; fc: Forecast; budgets: FcBudget[]; currency: string; onClose: () => void; onFix: (fix: NonNullable<ReturnType<typeof suggestFix>>) => void; busy: boolean; onBudgets: () => void }) {
  const { c } = useTheme();
  const flows = weekFlows(week).filter((x) => x.kind !== 'jar' || x.amount !== 0);
  const daily = everyday(week);
  const fix = week.sky === 'storm' || week.sky === 'cloud' ? suggestFix(f, week, b) : null;
  const payday = nextIncomeAfter(f, week.lowDate);
  const until = payday ? diffDays(week.lowDate, payday.date) : null;
  const mm = (n: number, sign = false) => money(n, currency, { sign });
  const title = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <SkyInline sky={week.sky} />
      <Txt style={{ fontSize: 17, fontWeight: '700' }}>
        {week.sky === 'storm' ? 'Storm warning' : CONDITION[week.sky]} · {range(week.start, week.end)}
      </Txt>
    </View>
  );
  return (
    <Sheet open onClose={onClose} title={title}>
      <View style={{ gap: 9, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 13, backgroundColor: c.bt }}>
        {flows.map((x, i) => (
          <View key={`${x.ref}${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Txt style={{ flex: 1, fontWeight: '600' }}>
              {x.name} {x.calendar ? <Txt style={{ color: c.muted, fontWeight: '500' }}>from your calendar</Txt> : null}
            </Txt>
            <Txt style={[{ fontWeight: '700', color: x.amount > 0 ? c.pos : c.ink }, tabular]}>{x.amount > 0 ? mm(x.amount, true) : mm(-x.amount)}</Txt>
          </View>
        ))}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Txt style={{ flex: 1, fontWeight: '600' }}>
            Everyday spending <Txt style={{ color: c.muted, fontWeight: '500' }}>from your budgets</Txt>
          </Txt>
          <Txt style={[{ fontWeight: '700' }, tabular]}>{mm(daily)}</Txt>
        </View>
      </View>
      <Note>
        {week.low < 0 ? 'Your balance dips to ' : 'Your lowest point is '}
        {mm(week.low)} on {short(week.lowDate)}
        {until !== null && until > 0 && until < 14 ? `, ${countWord(until)} ${until === 1 ? 'day' : 'days'} before payday.` : '.'}
      </Note>
      {fix ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: c.warnLine, borderRadius: 13, backgroundColor: c.warnBg }}>
            <I d="bulb" size={18} color="#d97706" />
            <Txt style={{ flex: 1 }}>
              Spend <B>{mm(fix.amount)}</B> less on {fix.name.toLowerCase()} before {short(fix.until)} to cover it.
            </Txt>
          </View>
          <SheetActions>
            <Btn variant="ghost" onPress={onClose}>
              Later
            </Btn>
            <Btn style={{ flex: 1 }} busy={busy} onPress={() => onFix(fix)}>
              Fix it
            </Btn>
          </SheetActions>
        </>
      ) : week.sky === 'storm' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: c.warnLine, borderRadius: 13, backgroundColor: c.warnBg }}>
          <I d="bulb" size={18} color="#d97706" />
          <Txt style={{ flex: 1 }}>
            Your budgets have no room left this month. Lower a bill, move a planned cost, or{' '}
            <Txt onPress={onBudgets} style={{ color: c.b, fontWeight: '700' }}>
              adjust budgets
            </Txt>
            .
          </Txt>
        </View>
      ) : (
        <Btn variant="ghost" wide onPress={onClose}>
          Close
        </Btn>
      )}
    </Sheet>
  );
}

function BalanceSheet({ open, onClose, currency, balance, negative, busy, onSave }: { open: boolean; onClose: () => void; currency: string; balance: number; negative: boolean; busy: boolean; onSave: (form: Record<string, string>) => void }) {
  const [sign, setSign] = useState<'-' | '+'>(negative ? '-' : '+');
  const [value, setValue] = useState(moneyText(balance));
  useEffect(() => {
    if (open) {
      setSign(negative ? '-' : '+');
      setValue(moneyText(balance));
    }
  }, [open, balance, negative]);
  return (
    <Sheet open={open} onClose={onClose} title="Update your balance" sub="What is in your account right now. Everything you log after this moves it.">
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        <SignToggle value={sign} onChange={setSign} label="Positive or overdrawn" />
        <View style={{ flex: 1 }}>
          <MoneyInput currency={currency} value={value} onChangeText={setValue} autoFocus label="Balance" />
        </View>
      </View>
      <SheetActions>
        <Btn variant="ghost" onPress={onClose}>
          Cancel
        </Btn>
        <Btn style={{ flex: 1 }} busy={busy} onPress={() => onSave({ balanceSign: sign, balance: value })}>
          Save balance
        </Btn>
      </SheetActions>
    </Sheet>
  );
}

function CushionSheet({ open, onClose, currency, cushion, busy, onSave }: { open: boolean; onClose: () => void; currency: string; cushion: number; busy: boolean; onSave: (form: Record<string, string>) => void }) {
  const [value, setValue] = useState(moneyText(cushion));
  useEffect(() => {
    if (open) setValue(moneyText(cushion));
  }, [open, cushion]);
  return (
    <Sheet open={open} onClose={onClose} title="Your cushion" sub="Weeks that dip below it show as cloudy.">
      <Field>
        <MoneyInput currency={currency} value={value} onChangeText={setValue} autoFocus label="Cushion" />
      </Field>
      <SheetActions>
        <Btn variant="ghost" onPress={onClose}>
          Cancel
        </Btn>
        <Btn style={{ flex: 1 }} busy={busy} onPress={() => onSave({ cushion: value })}>
          Save cushion
        </Btn>
      </SheetActions>
    </Sheet>
  );
}
