import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Check, DateField, Meter, Photo, PhotoField, photoForm, Tag, CatDot, type PhotoValue } from '../forms';
import I from '../Icon';
import { Btn, BtnText, Card, CardHead, CardSub, CardTitle, ConfirmX, Field, Input, MoneyInput, Note, Sheet, SheetActions, SignToggle, Small, Txt, moneyText, tabular } from '../ui';
import { StatCard, StatValue } from './Bills';
import { diffDays, short } from '../../lib/money/dates';
import { exact, initials, money } from '../../lib/money/format';
import { useTheme } from '../../lib/theme-context';
import type { DebtRow, Money } from '../../lib/types';

type Run = (name: string, payload?: { form?: Record<string, unknown> }) => Promise<boolean>;
const BACK = '/spending?tab=owed';

// Person or institution, as two choices with icons (.sign).
function PartyToggle({ value, onChange }: { value: 'person' | 'institution'; onChange: (v: 'person' | 'institution') => void }) {
  const { c } = useTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Person or institution" style={{ flexDirection: 'row', padding: 3, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.bg, alignSelf: 'flex-start' }}>
      {([['person', 'user', 'Person'], ['institution', 'bank', 'Bank or institution']] as const).map(([v, icon, label]) => (
        <Pressable key={v} onPress={() => onChange(v)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 8, borderRadius: 8 }, value === v && { backgroundColor: c.card }]}>
          <I d={icon} size={14} color={value === v ? c.ink : c.muted} />
          <Txt style={{ fontWeight: '800', color: value === v ? c.ink : c.muted }}>{label}</Txt>
        </Pressable>
      ))}
    </View>
  );
}

function DebtForm({ d, currency, run, busy, onDone }: { d?: DebtRow; currency: string; run: Run; busy: boolean; onDone: () => void }) {
  const [direction, setDirection] = useState<'-' | '+'>('-');
  const [party, setParty] = useState<'person' | 'institution'>(d?.party === 'institution' ? 'institution' : 'person');
  const [person, setPerson] = useState(d?.person ?? '');
  const [amount, setAmount] = useState(d ? moneyText(d.amount) : '');
  const [dueDate, setDueDate] = useState(d?.dueDate ?? '');
  const [note, setNote] = useState(d?.note ?? '');
  const [photo, setPhoto] = useState<PhotoValue>({ photo: '', cleared: false });
  const [moved, setMoved] = useState(true);

  const save = async () => {
    const ok = await run(d ? 'updateDebtAction' : 'addDebtAction', { form: { ...(d ? { id: d.id } : { direction }), party, person, amount, dueDate, note, ...photoForm(photo), ...(!d && moved ? { moved: '1' } : {}) } });
    if (ok) onDone();
  };
  return (
    <>
      {!d && <SignToggle value={direction} onChange={setDirection} minus="I lent" plus="I borrowed" label="Lent or borrowed" />}
      <PartyToggle value={party} onChange={setParty} />
      <Field label={d ? 'Name' : 'Who'}>
        <Input value={person} onChangeText={setPerson} placeholder={d ? undefined : 'Sam, or Nordea'} maxLength={60} autoFocus autoComplete="off" />
      </Field>
      <Field label={d ? `Amount ${d.direction === 'lent' ? 'lent' : 'borrowed'}` : 'How much'}>
        <MoneyInput currency={currency} value={amount} onChangeText={setAmount} label="Amount" />
      </Field>
      <Field label="Pay back by (optional)">
        <DateField value={dueDate} onChange={setDueDate} clearable label="Pay back by" placeholder="No date" />
      </Field>
      <Field label="What for (optional)">
        <Input value={note} onChangeText={setNote} placeholder={d ? undefined : 'Concert tickets'} maxLength={120} />
      </Field>
      <PhotoField current={d?.photo} value={photo} onChange={setPhoto} label="Photo (optional)" round />
      {d && d.paid > 0 && <Note>{exact(d.paid, currency)} is already paid back.</Note>}
      {!d && (
        <>
          <Check checked={moved} onChange={setMoved}>
            The money went through my account today
          </Check>
          <Note>Money you owe with a date counts in Money Weather on that day. Money owed to you only counts once it is paid back.</Note>
        </>
      )}
      <SheetActions>
        <Btn variant="ghost" onPress={onDone}>
          Cancel
        </Btn>
        <Btn style={{ flex: 1 }} busy={busy} onPress={save}>
          Save
        </Btn>
      </SheetActions>
    </>
  );
}

function Row({ d, currency, today, run, busy }: { d: DebtRow; currency: string; today: string; run: Run; busy: boolean }) {
  const { c } = useTheme();
  const lent = d.direction === 'lent';
  const late = d.dueDate && !d.settledAt && d.left > 0 && d.dueDate < today;
  const soon = d.dueDate && !late ? diffDays(today, d.dueDate) : null;
  const pctPaid = Math.round((d.paid / d.amount) * 100);
  const [paying, setPaying] = useState(false);
  const [edit, setEdit] = useState(false);
  const [payAmount, setPayAmount] = useState(moneyText(d.left));
  const [payDate, setPayDate] = useState(today);
  useEffect(() => {
    if (paying) {
      setPayAmount(moneyText(d.left));
      setPayDate(today);
    }
  }, [paying, d.left, today]);
  const tone = d.party === 'institution' ? { bg: c.indigoBg, fg: c.indigo } : lent ? { bg: c.posBg, fg: c.pos } : { bg: c.negBg2, fg: c.neg };
  const act = (name: string, form: Record<string, unknown>) => run(name, { form: { back: BACK, ...form } });

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: c.line }}>
      {d.photo ? (
        <Photo src={d.photo} size={34} round />
      ) : (
        <CatDot bg={tone.bg} color={tone.fg}>
          {d.party === 'institution' ? <I d="bank" size={15} color={tone.fg} /> : initials(d.person)}
        </CatDot>
      )}
      <View style={{ flex: 1, minWidth: 160 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <Txt style={{ fontWeight: '700' }}>{d.person}</Txt>
          {d.party === 'institution' && <Tag>bank</Tag>}
        </View>
        <Small>
          {d.note ? `${d.note} · ` : ''}
          {d.settledAt ? `Settled · ${exact(d.amount, currency)}` : d.paid > 0 ? `${exact(d.paid, currency)} of ${exact(d.amount, currency)} paid back` : `${lent ? 'Lent' : 'Borrowed'} ${short(d.createdAt.slice(0, 10))}`}
          {d.dueDate && !d.settledAt ? <Txt style={{ fontSize: 12, color: late ? c.neg : c.muted, fontWeight: late ? '700' : '400' }}> · {late ? `was due ${short(d.dueDate)}` : soon === 0 ? 'due today' : `due ${short(d.dueDate)}`}</Txt> : null}
        </Small>
        {!d.settledAt && d.paid > 0 && (
          <View style={{ marginTop: 6, maxWidth: 220 }}>
            <Meter pct={pctPaid} color={lent ? '#22c55e' : undefined} />
          </View>
        )}
      </View>
      <Txt style={[{ fontWeight: '700', color: d.settledAt ? c.muted : lent ? c.pos : c.neg }, tabular]}>{exact(d.settledAt ? d.amount : d.left, currency)}</Txt>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        {d.settledAt ? (
          <Btn variant="ghost" small onPress={() => void act('reopenDebtAction', { id: d.id })}>
            Reopen
          </Btn>
        ) : (
          <>
            <Btn variant="ghost" small onPress={() => setPaying(true)}>
              {lent ? 'Got paid' : 'Paid back'}
            </Btn>
            <Pressable onPress={() => void act('settleDebtAction', { id: d.id })} accessibilityRole="button" accessibilityLabel={`Mark settled with ${d.person}`} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
              <I d="check" size={15} color={c.muted} />
            </Pressable>
          </>
        )}
        <Pressable onPress={() => setEdit(true)} accessibilityRole="button" accessibilityLabel={`Edit ${d.person}`} style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <I d="edit" size={14} color={c.muted} />
        </Pressable>
        <ConfirmX label={`Remove ${d.person}`} icon="trash" onConfirm={() => void act('deleteDebtAction', { id: d.id })} />
      </View>

      <Sheet open={paying} onClose={() => setPaying(false)} title={lent ? `${d.person} paid you back` : `You paid ${d.person} back`} sub={`${exact(d.left, currency)} left`}>
        <Field label="How much">
          <MoneyInput currency={currency} value={payAmount} onChangeText={setPayAmount} autoFocus label="How much" />
        </Field>
        <Field label="When">
          <DateField value={payDate} onChange={setPayDate} max={today} label="When" />
        </Field>
        <Note>This is logged in Spending and {lent ? 'adds to' : 'comes off'} your balance.</Note>
        <SheetActions>
          <Btn variant="ghost" onPress={() => setPaying(false)}>
            Cancel
          </Btn>
          <Btn
            style={{ flex: 1 }}
            busy={busy}
            onPress={async () => {
              if (await act('recordPaybackAction', { id: d.id, amount: payAmount, date: payDate })) setPaying(false);
            }}
          >
            Record
          </Btn>
        </SheetActions>
      </Sheet>
      <Sheet open={edit} onClose={() => setEdit(false)} title={`Edit ${d.person}`}>
        <DebtForm d={d} currency={currency} run={(n, p) => run(n, { form: { back: BACK, ...p?.form } })} busy={busy} onDone={() => setEdit(false)} />
      </Sheet>
    </View>
  );
}

// Money owed between you and others, in separate blocks.
export default function Owed({ data, openNew, run, busy }: { data: Money; openNew: boolean; run: Run; busy: boolean }) {
  const { c } = useTheme();
  const { me, debts } = data;
  const cur = me.currency;
  const [adding, setAdding] = useState(openNew);
  const [settledOpen, setSettledOpen] = useState(false);
  useEffect(() => {
    if (openNew) setAdding(true);
  }, [openNew]);
  const open = debts.filter((d) => !d.settledAt && d.left > 0);
  const byDue = (a: DebtRow, b: DebtRow) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
  const theyOwe = open.filter((d) => d.direction === 'lent').sort(byDue);
  const youOwe = open.filter((d) => d.direction === 'borrowed').sort(byDue);
  const settled = debts.filter((d) => d.settledAt || d.left === 0);
  const sum = (rows: DebtRow[]) => rows.reduce((s, d) => s + d.left, 0);
  const next = [...open].filter((d) => d.dueDate).sort(byDue)[0];

  const block = (title: string, sub: string, rows: DebtRow[], empty: string) => (
    <Card>
      <CardHead>
        <View style={{ flex: 1 }}>
          <CardTitle>{title}</CardTitle>
          <CardSub>{sub}</CardSub>
        </View>
        <CardSub style={tabular}>{money(sum(rows), cur)}</CardSub>
      </CardHead>
      {rows.length === 0 && <Note>{empty}</Note>}
      {rows.map((d) => (
        <Row key={d.id} d={d} currency={cur} today={me.today} run={run} busy={busy} />
      ))}
    </Card>
  );

  return (
    <>
      <StatCard label="People owe you">
        <StatValue color={c.pos}>{money(sum(theyOwe), cur)}</StatValue>
      </StatCard>
      <StatCard label="You owe">
        <StatValue color={sum(youOwe) ? c.neg : undefined}>{money(sum(youOwe), cur)}</StatValue>
      </StatCard>
      <StatCard label="Next due">
        <StatValue size={18}>{next ? `${next.person} · ${short(next.dueDate!)}` : 'Nothing due'}</StatValue>
      </StatCard>
      <Btn style={{ alignSelf: 'flex-start' }} onPress={() => setAdding(true)}>
        <I d="plus" size={15} stroke={2.6} color={c.onB} />
        <BtnText>Add money owed</BtnText>
      </Btn>
      {block('They owe you', 'Money you lent', theyOwe, 'Nobody owes you money.')}
      {block('You owe', 'Money you borrowed', youOwe, 'You do not owe anyone.')}
      {settled.length > 0 && (
        <Card>
          <Pressable onPress={() => setSettledOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: settledOpen }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle>Settled · {settled.length}</CardTitle>
            <I d="chevron" size={16} color={c.muted} />
          </Pressable>
          {settledOpen && settled.map((d) => <Row key={d.id} d={d} currency={cur} today={me.today} run={run} busy={busy} />)}
        </Card>
      )}
      <Sheet open={adding} onClose={() => setAdding(false)} title="Money owed" sub="Lent to a friend, or borrowed from someone.">
        <DebtForm currency={cur} run={(n, p) => run(n, { form: { back: BACK, ...p?.form } })} busy={busy} onDone={() => setAdding(false)} />
      </Sheet>
    </>
  );
}
