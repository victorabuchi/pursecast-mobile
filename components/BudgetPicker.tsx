import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Meter } from './forms';
import { Btn, CardSub, Input, MoneyInput, Note, Sheet, Txt, XBtn, tabular } from './ui';
import { amountOf } from '../lib/money/calc';
import { money } from '../lib/money/format';
import { useTheme } from '../lib/theme-context';

export type BudgetOption = { name: string; amount: number; color?: string; spent?: number; cut?: number };

// Everyday budgets added one at a time from a list, or typed as a new
// category, instead of every category at once. The parent keeps `shown` and
// `amounts` so they can be saved (budgetName{i} and budgetAmount{i}).
export default function BudgetPicker({ options, shown, setShown, amounts, setAmounts, currency }: { options: BudgetOption[]; shown: string[]; setShown: (f: (s: string[]) => string[]) => void; amounts: Record<string, string>; setAmounts: (f: (a: Record<string, string>) => Record<string, string>) => void; currency: string }) {
  const { c } = useTheme();
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState(false);
  const [newName, setNewName] = useState('');
  const byName = new Map(options.map((o) => [o.name, o]));
  const hidden = options.filter((o) => !shown.includes(o.name));
  const total = shown.reduce((s, n) => s + amountOf(amounts[n] ?? ''), 0);

  const add = (name: string) => {
    const clean = name.trim().slice(0, 40);
    if (!clean || shown.some((n) => n.toLowerCase() === clean.toLowerCase())) return;
    setShown((s) => [...s, clean]);
  };

  return (
    <View>
      {shown.length === 0 && <Note>No everyday budgets yet. Add the ones you spend on.</Note>}
      {shown.map((name) => {
        const o = byName.get(name);
        const spent = o?.spent;
        const planned = Math.max(0, Math.round(amountOf(amounts[name] ?? '') * 100) - (o?.cut ?? 0));
        const used = spent !== undefined ? Math.min(100, planned ? (spent / planned) * 100 : spent ? 100 : 0) : null;
        return (
          <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
            <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Txt style={{ fontWeight: '700', fontSize: 13, flexShrink: 1 }}>{name}</Txt>
                {spent !== undefined && (
                  <Txt style={[{ color: c.muted, fontSize: 13 }, tabular]}>
                    {money(spent, currency)} of {money(planned, currency)}
                    {o?.cut ? ` (−${money(o.cut, currency)} this month)` : ''}
                  </Txt>
                )}
              </View>
              {used !== null && <Meter pct={used} color={used >= 100 ? '#e5484d' : used > 80 ? '#f5a524' : (o?.color ?? undefined)} />}
            </View>
            <View style={{ width: 130 }}>
              <MoneyInput currency={currency} value={amounts[name] ?? ''} onChangeText={(v) => setAmounts((a) => ({ ...a, [name]: v }))} label={`${name} per month`} />
            </View>
            <XBtn onPress={() => setShown((s) => s.filter((n) => n !== name))} label={`Remove ${name}`} />
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
        {custom ? (
          <>
            <View style={{ flex: 1 }}>
              <Input
                value={newName}
                onChangeText={setNewName}
                autoFocus
                placeholder="Climbing"
                maxLength={40}
                accessibilityLabel="New category name"
                onSubmitEditing={() => {
                  add(newName);
                  setNewName('');
                  setCustom(false);
                }}
              />
            </View>
            <Btn
              variant="ghost"
              small
              onPress={() => {
                add(newName);
                setNewName('');
                setCustom(false);
              }}
            >
              Add
            </Btn>
          </>
        ) : (
          <Pressable onPress={() => setAdding(true)} accessibilityRole="button" style={{ flex: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: c.card }}>
            <Txt style={{ fontSize: 15, fontWeight: '500', color: c.muted }}>+ Add everyday spending…</Txt>
          </Pressable>
        )}
        <CardSub style={{ flexShrink: 0 }}>{money(Math.round(total * 100), currency)} a month</CardSub>
      </View>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add everyday spending">
        {hidden.map((o) => (
          <Pressable
            key={o.name}
            onPress={() => {
              add(o.name);
              setAdding(false);
            }}
            style={{ paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9 }}
          >
            <Txt>
              {o.name}
              {o.amount ? ` · suggested ${money(o.amount, currency)}` : ''}
            </Txt>
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            setAdding(false);
            setCustom(true);
          }}
          style={{ paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9 }}
        >
          <Txt style={{ fontWeight: '700', color: c.b }}>New category…</Txt>
        </Pressable>
      </Sheet>
    </View>
  );
}
