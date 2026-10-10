import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import BudgetPicker from '../../components/BudgetPicker';
import I from '../../components/Icon';
import Screen from '../../components/Screen';
import { DateField } from '../../components/forms';
import { AccountRows, AdvanceRows, OwedRows, RepeatRows, type AccountRowState, type AdvanceRowState, type OwedRow, type RepeatRow } from '../../components/setup/Rows';
import { Btn, Card, CardTitle, Field, Input, MoneyInput, Note, PageHead, Select, SignToggle, Txt, moneyText } from '../../components/ui';
import * as api from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { clearDrafts, fingerprint, useDraft } from '../../lib/draft';
import { DEFAULT_CATEGORIES } from '../../lib/money/categories';
import { addMonths, monthStart, short } from '../../lib/money/dates';
import { POPULAR_BILLS, POPULAR_SUBSCRIPTIONS } from '../../lib/money/presets';
import { useShell } from '../../lib/shell-context';
import { useTheme } from '../../lib/theme-context';
import type { RecurringRow, SetupData } from '../../lib/types';
import { useRunner } from '../../lib/use-page';
import { useFocusEffect } from 'expo-router';

const SECTIONS: Array<[string, string]> = [
  ['balance', 'Balance'],
  ['pay', 'Pay'],
  ['bills', 'Bills'],
  ['subscriptions', 'Subscriptions'],
  ['everyday', 'Everyday'],
];

const CURRENCIES: Array<[string, string]> = [
  ['EUR', 'Euro (€)'],
  ['USD', 'US dollar ($)'],
  ['GBP', 'Pound (£)'],
  ['SEK', 'Swedish krona'],
  ['NOK', 'Norwegian krone'],
  ['DKK', 'Danish krone'],
  ['CHF', 'Swiss franc'],
  ['PLN', 'Polish złoty'],
  ['CAD', 'Canadian dollar'],
  ['AUD', 'Australian dollar'],
  ['NGN', 'Nigerian naira'],
  ['INR', 'Indian rupee'],
  ['JPY', 'Japanese yen'],
];

type Form = {
  balance: string;
  balanceSign: '-' | '+';
  currency: string;
  salaryName: string;
  salary: string;
  salaryDate: string;
  rent: string;
  rentDate: string;
  accounts: AccountRowState[];
  owed: OwedRow[];
  lent: OwedRow[];
  advances: AdvanceRowState[];
  bills: RepeatRow[];
  subs: RepeatRow[];
  budgetShown: string[];
  budgetAmounts: Record<string, string>;
};

export default function SetupScreen() {
  const { logout } = useAuth();
  const [data, setData] = useState<SetupData | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      setData(await api.getSetup());
      setError('');
    } catch (e) {
      if (e instanceof api.SignedOut) await logout();
      else setError(e instanceof Error ? e.message : 'Could not load. Pull to try again.');
    }
  }, [logout]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  if (!data) return <Screen error={error} loading={!error} onRefresh={load} refreshing={false}>{null}</Screen>;
  // The form is built from the data, and starts again if that changed.
  return <SetupForm key={data.me.id + fingerprint([data.balance, data.recurring, data.debts, data.advances, data.accounts])} data={data} reload={load} />;
}

function SetupForm({ data, reload }: { data: SetupData; reload: () => Promise<void> }) {
  const { c } = useTheme();
  const router = useRouter();
  const { refreshShell } = useShell();
  const { run, busy } = useRunner(refreshShell);
  const { me, editing, cats, recurring, debts, balance, advances, accounts, rates } = data;
  const cur = me.currency;
  const nextFirst = monthStart(addMonths(me.today, 1));
  const flex = DEFAULT_CATEGORIES.filter((x) => x.kind === 'flex');

  // The same rows the web page is filled with.
  const initial = useMemo<Form>(() => {
    const catName = new Map(cats.map((x) => [x.id, x.name]));
    const salary = recurring.find((r) => r.amount > 0 && !r.paused);
    const rent = recurring.find((r) => r.amount < 0 && !r.paused && catName.get(r.categoryId ?? '') === 'Housing');
    const others = recurring.filter((r) => r.id !== salary?.id && r.id !== rent?.id && r.amount <= 0 && !r.paused);
    // Prices billed in another currency come back as billed ($25, not €22).
    const toRow = (r: RecurringRow, key: number): RepeatRow =>
      r.priceCurrency && r.priceAmount !== null ? { key, id: r.id, name: r.name, amount: String(r.priceAmount / 100), cur: r.priceCurrency, cadence: r.cadence, date: r.nextDate } : { key, id: r.id, name: r.name, amount: r.amount ? String(-r.amount / 100) : '', cadence: r.cadence, date: r.nextDate };
    const open = debts.filter((d) => !d.settledAt && d.left > 0);
    const debtRow = (d: (typeof debts)[number], key: number): OwedRow => ({ key, id: d.id, who: d.person, party: d.party === 'institution' ? 'institution' : 'person', amount: String(d.left / 100), date: d.dueDate ?? '' });
    const suggested = new Map(flex.map((x) => [x.name, x.budget]));
    const budgetOptions = editing ? cats.filter((x) => x.kind === 'flex').map((x) => ({ name: x.name, amount: x.budget || (suggested.get(x.name) ?? 0) })) : flex.map((x) => ({ name: x.name, amount: x.budget }));
    return {
      balance: editing ? moneyText(balance) : '',
      balanceSign: balance < 0 ? '-' : '+',
      currency: cur,
      salaryName: salary?.name ?? 'Salary',
      salary: salary ? moneyText(salary.amount) : '',
      salaryDate: salary?.nextDate ?? '',
      rent: rent ? moneyText(rent.amount) : '',
      rentDate: rent?.nextDate ?? nextFirst,
      accounts: accounts.map((a, key) => ({ key, id: a.id, name: a.name, kind: a.kind, amount: String(a.balance / 100), cur: a.currency === cur ? undefined : a.currency, count: a.inForecast })),
      owed: open.filter((d) => d.direction === 'borrowed').map(debtRow),
      lent: open.filter((d) => d.direction === 'lent').map(debtRow),
      advances: advances.map((a, key) => ({ key, id: a.id, amount: String(a.amount / 100), date: a.takenOn, note: `${a.pending ? 'Arrives' : 'Arrived'} ${short(a.takenOn)}${a.recurringId ? ` · comes off the ${short(a.payday)} pay` : ''}` })),
      bills: others.filter((r) => catName.get(r.categoryId ?? '') !== 'Subscriptions').map(toRow),
      subs: others.filter((r) => catName.get(r.categoryId ?? '') === 'Subscriptions').map(toRow),
      budgetShown: editing ? cats.filter((x) => x.kind === 'flex' && x.budget > 0).map((x) => x.name) : ['Groceries'],
      budgetAmounts: Object.fromEntries(budgetOptions.map((o) => [o.name, o.amount ? String(o.amount / 100) : ''])),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const budgetOptions = useMemo(() => {
    const suggested = new Map(flex.map((x) => [x.name, x.budget]));
    return editing ? cats.filter((x) => x.kind === 'flex').map((x) => ({ name: x.name, amount: x.budget || (suggested.get(x.name) ?? 0) })) : flex.map((x) => ({ name: x.name, amount: x.budget }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Everything typed is kept on this phone until it is saved, so leaving the
  // screen loses nothing.
  const [form, setForm] = useDraft<Form>(`${me.id}:${fingerprint(initial)}`, initial);
  const set = <K extends keyof Form>(key: K, value: Form[K] | ((prev: Form[K]) => Form[K])) => setForm((f) => ({ ...f, [key]: typeof value === 'function' ? (value as (p: Form[K]) => Form[K])(f[key]) : value }));

  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [scrollTo, setScrollTo] = useState<number | null>(null);
  // Read the position now: the event is gone by the time React runs the update.
  const mark = (key: string) => ({
    testID: `section-${key}`,
    onLayout: (e: { nativeEvent: { layout: { y: number } } }) => {
      const y = e.nativeEvent.layout.y;
      setOffsets((o) => (o[key] === y ? o : { ...o, [key]: y }));
    },
  });
  const jump = (id: string) => {
    setScrollTo(null);
    setTimeout(() => setScrollTo(offsets[id] ?? 0), 0);
  };

  const salary = recurring.find((r) => r.amount > 0 && !r.paused);
  const catName = new Map(cats.map((x) => [x.id, x.name]));
  const rent = recurring.find((r) => r.amount < 0 && !r.paused && catName.get(r.categoryId ?? '') === 'Housing');
  const others = recurring.filter((r) => r.id !== salary?.id && r.id !== rent?.id && r.amount <= 0 && !r.paused);
  const open = debts.filter((d) => !d.settledAt && d.left > 0);

  const save = async () => {
    const out: Record<string, unknown> = {
      balance: form.balance,
      balanceSign: form.balanceSign,
      currency: form.currency,
      salaryName: form.salaryName,
      salary: form.salary,
      salaryDate: form.salaryDate,
      rent: form.rent,
      rentDate: form.rentDate,
    };
    if (editing) {
      out['balanceWas'] = String(balance);
      out['shownRecurring'] = [salary, rent, ...others].filter(Boolean).map((r) => r!.id).join(',');
      out['shownDebts'] = open.map((d) => d.id).join(',');
      out['shownAdvances'] = advances.map((a) => a.id).join(',');
      out['shownAccounts'] = accounts.map((a) => a.id).join(',');
      if (salary) out['salaryId'] = salary.id;
      if (rent) {
        out['rentId'] = rent.id;
        out['rentName'] = rent.name;
      }
    }
    form.accounts.forEach((r, i) => {
      out[`accName${i}`] = r.name;
      out[`accKind${i}`] = r.kind;
      out[`accAmount${i}`] = r.amount;
      out[`accAmount${i}Currency`] = r.cur && r.cur !== form.currency ? r.cur : '';
      if (r.count) out[`accCount${i}`] = 'on';
      if (r.id) out[`accId${i}`] = r.id;
    });
    for (const [prefix, rows] of [['owed', form.owed], ['lent', form.lent]] as const) {
      rows.forEach((r, i) => {
        out[`${prefix}Who${i}`] = r.who;
        out[`${prefix}Party${i}`] = r.party;
        out[`${prefix}Amount${i}`] = r.amount;
        out[`${prefix}Date${i}`] = r.date;
        if (r.id) out[`${prefix}Id${i}`] = r.id;
      });
    }
    form.advances.forEach((r, i) => {
      out[`advAmount${i}`] = r.amount;
      out[`advDate${i}`] = r.date;
      if (r.id) out[`advId${i}`] = r.id;
    });
    for (const [prefix, rows] of [['bill', form.bills], ['sub', form.subs]] as const) {
      rows.forEach((r, i) => {
        out[`${prefix}Name${i}`] = r.name;
        out[`${prefix}Amount${i}`] = r.amount;
        out[`${prefix}Amount${i}Currency`] = r.cur && r.cur !== form.currency ? r.cur : '';
        out[`${prefix}Cadence${i}`] = r.cadence;
        out[`${prefix}Date${i}`] = r.date;
        if (r.id) out[`${prefix}Id${i}`] = r.id;
      });
    }
    out['budgetsAll'] = '1';
    form.budgetShown.forEach((name, i) => {
      out[`budgetName${i}`] = name;
      out[`budgetAmount${i}`] = form.budgetAmounts[name] ?? '';
    });
    if (await run('completeSetupAction', { form: out })) {
      await clearDrafts();
      await reload();
      router.replace('/forecast');
    }
  };

  const title = editing ? 'Your setup' : `Hi ${me.name}, let's draw your forecast`;
  const sub = editing ? 'Change anything, then save to redraw your forecast' : 'Two minutes · change anything later';

  return (
    <Screen
      onRefresh={reload}
      refreshing={false}
      scrollToY={scrollTo}
      footer={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, paddingLeft: 16, paddingRight: 10, borderWidth: 1, borderColor: c.line, borderRadius: 16, backgroundColor: c.glass }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
            <I d="check" size={13} color={c.muted} />
            <Txt style={{ color: c.muted, fontSize: 12.5 }}>Kept on this device until you save</Txt>
          </View>
          <Btn busy={busy} onPress={save}>
            {editing ? 'Save and redraw my forecast' : 'Show my forecast'}
          </Btn>
        </View>
      }
    >
      <PageHead title={title} sub={sub} icon="sun" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={{ flexDirection: 'row', gap: 6, padding: 6, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.glass }}>
          {SECTIONS.map(([id, label], i) => (
            <Pressable key={id} onPress={() => jump(id)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.bt, alignItems: 'center', justifyContent: 'center' }}>
                <Txt style={{ color: c.b, fontSize: 11, fontWeight: '700', lineHeight: 14 }}>{i + 1}</Txt>
              </View>
              <Txt style={{ fontSize: 13, fontWeight: '700' }}>{label}</Txt>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View {...mark('balance')}>
        <Card>
          <CardTitle>1. Money in your account today</CardTitle>
          <Note>
            {editing ? 'Your balance now, with everything logged so far. Change it only if your bank shows something else.' : 'Your main account, the one bills are paid from. No bank login needed.'}{' '}
            <Txt onPress={() => router.navigate('/banks?add=1')} style={{ color: c.b, fontWeight: '700', fontSize: 13 }}>
              Or connect your bank
            </Txt>
          </Note>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
            <SignToggle value={form.balanceSign} onChange={(v) => set('balanceSign', v)} label="Positive or overdrawn" />
            <View style={{ flex: 1 }}>
              <MoneyInput currency={form.currency} value={form.balance} onChangeText={(v) => set('balance', v)} placeholder="2,340" autoFocus={!editing} label="Balance today" />
            </View>
          </View>
          <Select value={form.currency} onChange={(v) => set('currency', v)} label="Currency" options={CURRENCIES.map(([id, label]) => ({ id, label }))} />
          <AccountRows currency={form.currency} rates={rates} rows={form.accounts} setRows={(f) => set('accounts', f)} />
          <OwedRows currency={form.currency} today={me.today} rows={form.owed} setRows={(f) => set('owed', f)} />
          <OwedRows currency={form.currency} today={me.today} rows={form.lent} setRows={(f) => set('lent', f)} lent />
        </Card>
      </View>

      <View {...mark('pay')}>
        <Card>
          <CardTitle>2. Your pay</CardTitle>
          <Field label="Name">
            <Input value={form.salaryName} onChangeText={(v) => set('salaryName', v)} />
          </Field>
          <Field label="Amount after tax, each month">
            <MoneyInput currency={form.currency} value={form.salary} onChangeText={(v) => set('salary', v)} placeholder="2,900" label="Salary" />
          </Field>
          <Field label="Next payday" hint="empty = 1st of next month">
            <DateField value={form.salaryDate} onChange={(v) => set('salaryDate', v)} min={me.today} clearable label="Next payday" placeholder="Next payday" />
          </Field>
          <AdvanceRows currency={form.currency} today={me.today} rows={form.advances} setRows={(f) => set('advances', f)} />
        </Card>
      </View>

      <View {...mark('bills')}>
        <Card>
          <CardTitle>3. Rent and bills</CardTitle>
          <Field label={rent?.name ?? 'Rent or mortgage'}>
            <MoneyInput currency={form.currency} value={form.rent} onChangeText={(v) => set('rent', v)} placeholder="950" label="Rent" />
          </Field>
          <Field label="Next due date">
            <DateField value={form.rentDate} onChange={(v) => set('rentDate', v)} label="Rent next due date" />
          </Field>
          <Note>Phone, electricity, insurance. Add them one at a time. No date or price yet? Just the name is fine.</Note>
          <RepeatRows presets={POPULAR_BILLS} currency={form.currency} rates={rates} today={me.today} addLabel="Add a bill" rows={form.bills} setRows={(f) => set('bills', f)} />
        </Card>
      </View>

      <View {...mark('subscriptions')}>
        <Card>
          <CardTitle>4. Subscriptions</CardTitle>
          <Note>Streaming, apps, the gym. Yearly ones too, so they never surprise you. No fixed price or date (like Render or Supabase)? Just add the name.</Note>
          <RepeatRows presets={POPULAR_SUBSCRIPTIONS} currency={form.currency} rates={rates} today={me.today} addLabel="Add a subscription" rows={form.subs} setRows={(f) => set('subs', f)} />
        </Card>
      </View>

      <View {...mark('everyday')}>
        <Card>
          <CardTitle>5. Everyday spending each month</CardTitle>
          <Note>Add what you spend on day to day, one at a time. Rough is fine; Worth-It will suggest better amounts as you rate what you buy.</Note>
          <BudgetPicker options={budgetOptions} shown={form.budgetShown} setShown={(f) => set('budgetShown', f)} amounts={form.budgetAmounts} setAmounts={(f) => set('budgetAmounts', f)} currency={form.currency} />
        </Card>
      </View>

      {editing && <Note style={{ textAlign: 'center' }}>Removing a row here removes that bill, debt or advance. Paused bills stay as they are.</Note>}
    </Screen>
  );
}
