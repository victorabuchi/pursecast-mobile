import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Grad from '../../components/Grad';
import I from '../../components/Icon';
import Screen from '../../components/Screen';
import { Btn, BtnText, Card, CardHead, CardSub, CardTitle, ConfirmX, Input, LinkBtn, Note, PageHead, Segment, Select, Sheet, Small, TipCard, Txt, tabular } from '../../components/ui';
import * as api from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { diffDays, monthName, short } from '../../lib/money/dates';
import { exact, money } from '../../lib/money/format';
import { story, tidyName } from '../../lib/statements/analysis';
import { STATEMENT_CATEGORIES, type Txn } from '../../lib/statements/types';
import { useTheme } from '../../lib/theme-context';
import type { StatementsData } from '../../lib/types';
import { useRunner } from '../../lib/use-page';

const COLORS: Record<string, string> = {
  Income: '#15803d',
  Groceries: '#16a34a',
  'Eating out': '#f97316',
  Takeaway: '#ef4444',
  Coffee: '#a16207',
  Transport: '#0ea5e9',
  Housing: '#0f7a63',
  'Bills & insurance': '#475569',
  Subscriptions: '#d946ef',
  Shopping: '#ec4899',
  Health: '#14b8a6',
  Fun: '#8b5cf6',
  Travel: '#6366f1',
  Gifts: '#f43f5e',
  Cash: '#84cc16',
  Fees: '#78716c',
  Transfers: '#94a3b8',
  Other: '#64748b',
};
const PAGE = 80;

export default function StatementsScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const { logout } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [data, setData] = useState<StatementsData | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [count, setCount] = useState(PAGE);

  const load = useCallback(
    async (id: string | null = selectedId) => {
      try {
        setData(await api.getStatements(id));
        setError('');
      } catch (e) {
        if (e instanceof api.SignedOut) await logout();
        else setError(e instanceof Error ? e.message : 'Could not load. Pull to try again.');
      }
    },
    [selectedId, logout],
  );
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const { run } = useRunner(() => load());

  if (!data) return <Screen error={error} loading={!error} onRefresh={() => load()} refreshing={false}>{null}</Screen>;
  const { me, statements, txns: rows } = data;
  const cur = me.currency;
  const m = (n: number) => money(n, cur);
  const selected = statements.find((x) => x.id === data.selected);
  const txns: Array<Txn & { id: string }> = rows;
  const monthLabel = (month: string) => `${monthName(month, true)} ${month.slice(0, 4)}`;
  const s = story(txns, m, monthLabel);
  const tracked = new Set(data.tracked.map((x) => x.toLowerCase()));

  // The list: search and category filter, newest first.
  const needle = q.trim().toLowerCase();
  const listed = txns.filter((t) => (!needle || `${t.place} ${t.description}`.toLowerCase().includes(needle)) && (!cat || t.category === cat));
  const shown = Math.min(listed.length, count);

  const pick = (id: string | null) => {
    setSelectedId(id);
    setCount(PAGE);
    void load(id);
  };

  const onUploaded = async (statementId: string | null) => {
    if (statementId) {
      setSelectedId(statementId);
      await load(statementId);
    } else await load();
  };

  return (
    <Screen error={error} onRefresh={() => load()} refreshing={false}>
      <PageHead
        title="Statements"
        sub="Where your money went"
        icon="file"
        right={
          statements.length > 0 && (
            <Segment options={[{ id: 'all', label: 'All' }, ...statements.slice(0, 5).map((st) => ({ id: st.id, label: st.name.slice(0, 24) }))]} value={selected?.id ?? 'all'} onChange={(id) => pick(id === 'all' ? null : id)} />
          )
        }
      />

      <Pressable onPress={() => router.navigate('/banks')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.bt, alignItems: 'center', justifyContent: 'center' }}>
          <I d="bank" size={19} color={c.b} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '700' }}>Connect your bank instead</Txt>
          <Small>S-Pankki, OP, Nordea, Revolut and most European banks. New transactions arrive by themselves.</Small>
        </View>
        <I d="right" size={18} color={c.ink} />
      </Pressable>

      {!data.aiReady && <Note>Screenshots and PDFs need an Anthropic API key (ANTHROPIC_API_KEY) on the server. Excel and CSV exports from your bank work already.</Note>}

      {!s ? (
        <View style={{ gap: 14 }}>
          <TipCard>
            <Txt style={{ fontWeight: '700', fontSize: 13.5 }}>See a whole year at a glance.</Txt> Upload a bank statement for any period, say October 2025 to September 2026, as a PDF, screenshots, or the Excel/CSV export from your bank. Pursecast reads every transaction and shows where your money came from and where it went. It does not change your balance or forecast.
          </TipCard>
          <Uploader onDone={onUploaded} />
        </View>
      ) : (
        <>
          <CardHead>
            <CardSub style={{ flex: 1 }}>
              {short(s.from)} {s.from.slice(0, 4)} – {short(s.to)} {s.to.slice(0, 4)} · {s.months.length} {s.months.length === 1 ? 'month' : 'months'} · {txns.length} transactions
              {selected ? ` · ${selected.name}` : ''}
            </CardSub>
          </CardHead>
          {selected && (
            <Pressable
              onPress={async () => {
                if (await run('deleteStatementAction', { form: { id: selected.id } })) pick(null);
              }}
            >
              <Txt style={{ color: c.muted, fontSize: 13 }}>Remove this statement</Txt>
            </Pressable>
          )}

          <Big label="Money in">
            <Txt style={[{ fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.52, color: c.pos }, tabular]}>{m(s.moneyIn)}</Txt>
          </Big>
          <Big label="Money out">
            <Txt style={[{ fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.52 }, tabular]}>{m(s.moneyOut)}</Txt>
          </Big>
          <Big label={s.moneyIn >= s.moneyOut ? 'You kept' : 'You overspent'}>
            <Txt style={[{ fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.52, color: s.moneyIn >= s.moneyOut ? c.pos : c.neg }, tabular]}>{m(Math.abs(s.moneyIn - s.moneyOut))}</Txt>
          </Big>
          <Big label="Spent per month">
            <Txt style={[{ fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.52 }, tabular]}>{m(Math.round(s.moneyOut / Math.max(1, Math.round(diffDays(s.from, s.to) / 30.4) || 1)))}</Txt>
          </Big>

          {s.highlights.length > 0 && (
            <Grad from="#062a22" to="#0f7a63" style={{ borderRadius: 14 }}>
              <View style={{ gap: 8, paddingVertical: 16, paddingHorizontal: 18 }}>
                {s.highlights.map((h) => (
                  <View key={h} style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ width: 6, height: 6, marginTop: 9, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.7)' }} />
                    <Txt style={{ flex: 1, color: '#fff', fontSize: 14.5, lineHeight: 21.75 }}>{h}</Txt>
                  </View>
                ))}
              </View>
            </Grad>
          )}

          <Card>
            <CardHead>
              <CardTitle>Month by month</CardTitle>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Dot color="#22c55e" />
                <CardSub>In</CardSub>
                <View style={{ width: 12 }} />
                <Dot color="#0f7a63" />
                <CardSub>Out</CardSub>
              </View>
            </CardHead>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 180, paddingTop: 8 }}>
              {s.months.map((mo) => {
                const top = Math.max(1, ...s.months.map((x) => Math.max(x.in, x.out)));
                return (
                  <View key={mo.month} accessibilityLabel={`${monthLabel(mo.month)}: in ${m(mo.in)}, out ${m(mo.out)}`} style={{ flex: 1, alignItems: 'center', gap: 6, minWidth: 0, height: '100%' }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, width: '100%' }}>
                      <View style={{ width: '42%', maxWidth: 18, height: `${(mo.in / top) * 100}%`, backgroundColor: '#22c55e', borderTopLeftRadius: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
                      <View style={{ width: '42%', maxWidth: 18, height: `${(mo.out / top) * 100}%`, backgroundColor: '#0f7a63', borderTopLeftRadius: 5, borderTopRightRadius: 5, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 }} />
                    </View>
                    <Txt style={{ color: c.muted, fontSize: 11 }}>{monthName(mo.month)}</Txt>
                  </View>
                );
              })}
            </View>
          </Card>

          <Card>
            <CardTitle>Where it went</CardTitle>
            {s.categories.map((cg) => (
              <Pressable
                key={cg.name}
                onPress={() => {
                  setCat(cg.name);
                  setCount(PAGE);
                }}
                style={{ gap: 6 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                    <Dot color={COLORS[cg.name] ?? '#64748b'} />
                    <Txt style={{ fontSize: 13 }}>
                      {cg.name} <Txt style={{ color: c.muted, fontSize: 13 }}>· {Math.round(cg.share * 100)}%</Txt>
                    </Txt>
                  </View>
                  <Txt style={[{ fontSize: 13, fontWeight: '700' }, tabular]}>{m(cg.out)}</Txt>
                </View>
                <View style={{ height: 9, borderRadius: 5, backgroundColor: c.bg, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.max(2, (cg.out / s.categories[0]!.out) * 100)}%`, height: '100%', borderRadius: 5, backgroundColor: COLORS[cg.name] ?? '#64748b' }} />
                </View>
              </Pressable>
            ))}
          </Card>

          <Card>
            <CardTitle>Where you paid most</CardTitle>
            {s.places.map((p, i) => (
              <Line key={p.name} title={`${i + 1}. ${p.name}`} sub={`${p.count} ${p.count === 1 ? 'payment' : 'payments'}`} right={<Txt style={[{ fontWeight: '700' }, tabular]}>{m(p.out)}</Txt>} />
            ))}
          </Card>

          <Card>
            <CardTitle>Where money came from</CardTitle>
            {s.sources.length === 0 && <Note>No money came in during this period.</Note>}
            {s.sources.map((p) => (
              <Line key={p.name} title={p.name} sub={`${p.count} ${p.count === 1 ? 'payment' : 'payments'} · ${Math.round((p.in / s.moneyIn) * 100)}%`} right={<Txt style={[{ fontWeight: '700', color: c.pos }, tabular]}>{m(p.in)}</Txt>} />
            ))}
          </Card>

          <Card>
            <CardTitle>Regular charges</CardTitle>
            {s.recurring.length === 0 && <Note>No charges repeat month after month here.</Note>}
            {s.recurring.map((r) => (
              <Line
                key={r.name}
                title={tidyName(r.name)}
                sub={`~${m(r.typical)} a month · seen in ${r.months} months · ${m(r.yearly)} a year`}
                right={
                  tracked.has(tidyName(r.name).toLowerCase()) ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <I d="check" size={13} stroke={2.6} color={c.pos} />
                      <Txt style={{ color: c.pos, fontSize: 12.5, fontWeight: '700' }}>Tracked</Txt>
                    </View>
                  ) : (
                    <Btn variant="ghost" small onPress={() => void run('trackChargeAction', { form: { name: tidyName(r.name), amount: (r.typical / 100).toFixed(2), last: r.last, category: r.category } })}>
                      <I d="plus" size={13} stroke={2.6} color={c.ink} />
                      <BtnText variant="ghost" small>{`Add · ${exact(r.typical, cur)} a month`}</BtnText>
                    </Btn>
                  )
                }
              />
            ))}
          </Card>

          <Card>
            <CardTitle>Biggest purchases</CardTitle>
            {s.biggest.map((t, i) => (
              <Line key={`${t.date}${t.amount}${i}`} title={t.place} sub={`${short(t.date)} ${t.date.slice(0, 4)} · ${t.category}`} right={<Txt style={[{ fontWeight: '700' }, tabular]}>{exact(-t.amount, cur)}</Txt>} />
            ))}
          </Card>

          <Card>
            <CardHead>
              <CardTitle>
                All transactions {cat ? `· ${cat} ` : ''}
                <CardSub>({listed.length})</CardSub>
              </CardTitle>
              {(needle || cat) && (
                <LinkBtn
                  size={13}
                  onPress={() => {
                    setQ('');
                    setCat('');
                    setCount(PAGE);
                  }}
                >
                  Clear filter
                </LinkBtn>
              )}
            </CardHead>
            <Uploader statementId={selected?.id} compact label="Add a transaction from a screenshot, or more statements" onDone={onUploaded} />
            <Input value={q} onChangeText={setQ} placeholder="Search places and descriptions" accessibilityLabel="Search" autoCorrect={false} />
            <Select value={cat} onChange={(v) => (setCat(v), setCount(PAGE))} label="Category" options={[{ id: '', label: 'All categories' }, ...STATEMENT_CATEGORIES.map((x) => ({ id: x, label: x }))]} />
            <View>
              {listed.slice(0, shown).map((t) => (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }}>
                  <Txt style={{ color: c.muted, fontSize: 13.5, width: 52 }}>
                    {short(t.date)} {t.date.slice(2, 4)}
                  </Txt>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt style={{ fontWeight: '700', fontSize: 13.5 }}>{t.place}</Txt>
                    {t.description !== t.place && (
                      <Txt style={{ color: c.muted, fontSize: 12 }} numberOfLines={2}>
                        {t.description}
                      </Txt>
                    )}
                    <TxnCategory value={t.category} onChange={(category) => void run('setTxnCategoryAction', { form: { id: t.id, category, back: '/statements' } })} />
                  </View>
                  <Txt style={[{ fontSize: 13.5, fontWeight: '700', color: t.amount > 0 ? c.pos : c.ink }, tabular]}>{exact(t.amount, cur, { sign: t.amount > 0 })}</Txt>
                  <ConfirmX label={`Delete ${t.place}`} onConfirm={() => void run('deleteTxnAction', { form: { id: t.id, back: '/statements' } })} />
                </View>
              ))}
            </View>
            {listed.length > shown && (
              <Btn variant="ghost" small style={{ alignSelf: 'flex-start' }} onPress={() => setCount(shown + PAGE * 2)}>
                {`Show more (${listed.length - shown} left)`}
              </Btn>
            )}
          </Card>
        </>
      )}
    </Screen>
  );
}

function Big({ label, children }: { label: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Card style={{ gap: 2 }}>
      <Txt style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>{label}</Txt>
      {children}
    </Card>
  );
}

function Dot({ color }: { color: string }) {
  return <View style={{ width: 10, height: 10, marginRight: 6, borderRadius: 3, backgroundColor: color }} />;
}

function Line({ title, sub, right }: { title: string; sub: string; right: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.line }}>
      <View style={{ flex: 1 }}>
        <Txt style={{ fontWeight: '700' }}>{title}</Txt>
        <Small>{sub}</Small>
      </View>
      {right}
    </View>
  );
}

// Changing it saves right away, for every transaction at the same place.
function TxnCategory({ value, onChange }: { value: string; onChange: (category: string) => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Category" hitSlop={6} style={{ alignSelf: 'flex-start' }}>
        <Txt style={{ color: c.muted, fontSize: 12 }}>{value}</Txt>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title="Category">
        {STATEMENT_CATEGORIES.map((x) => (
          <Pressable
            key={x}
            onPress={() => {
              setOpen(false);
              if (x !== value) onChange(x);
            }}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 9, backgroundColor: x === value ? c.bt : 'transparent' }}
          >
            <Txt style={{ fontWeight: x === value ? '700' : '500', color: x === value ? c.b : c.ink }}>{x}</Txt>
            {x === value ? <I d="check" size={16} color={c.b} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

type Result = { statementId: string | null; added: number; skipped: number; notes: string[]; error?: string };

// Pick statements, screenshots or exports. They are read on the server; the
// screen then shows what was found.
function Uploader({ statementId, compact, label, onDone }: { statementId?: string; compact?: boolean; label?: string; onDone: (statementId: string | null) => void | Promise<void> }) {
  const { c } = useTheme();
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const send = async (files: Array<{ uri: string; name: string; type: string }>) => {
    if (!files.length) return;
    setResult(null);
    setBusy(files.length === 1 ? `Reading ${files[0]!.name}…` : `Reading ${files.length} files…`);
    const form = new FormData();
    for (const f of files) form.append('files', { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
    if (statementId) form.append('statementId', statementId);
    try {
      const data = (await api.uploadStatements(form)) as unknown as Result;
      setResult(data);
      await onDone(data.statementId && data.added ? data.statementId : null);
    } catch (e) {
      setResult({ statementId: null, added: 0, skipped: 0, notes: [], error: e instanceof api.ApiError ? e.message : 'The upload did not go through. Check your connection and try again.' });
    } finally {
      setBusy(null);
    }
  };

  const fromPhotos = async () => {
    setChoosing(false);
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 10, quality: 0.9 });
    if (picked.canceled) return;
    await send(picked.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `screenshot-${i + 1}.jpg`, type: a.mimeType ?? 'image/jpeg' })));
  };
  const fromFiles = async () => {
    setChoosing(false);
    const picked = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: ['application/pdf', 'text/csv', 'text/comma-separated-values', 'text/tab-separated-values', 'text/plain', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/*'] });
    if (picked.canceled) return;
    await send(picked.assets.map((a) => ({ uri: a.uri, name: a.name, type: a.mimeType ?? 'application/octet-stream' })));
  };

  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={() => !busy && setChoosing(true)} accessibilityRole="button" accessibilityState={{ busy: Boolean(busy) }} style={{ flexDirection: compact ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: compact ? 0 : 150, paddingVertical: compact ? 12 : 22, paddingHorizontal: compact ? 16 : 22, borderWidth: 2, borderStyle: 'dashed', borderColor: c.line2, borderRadius: 16, backgroundColor: c.card }}>
        {busy ? (
          <>
            <ActivityIndicator color={c.b} />
            <Txt style={{ fontWeight: '700' }}>{busy}</Txt>
            <Txt style={{ color: c.muted, fontSize: 12 }}>Long statements can take a minute.</Txt>
          </>
        ) : (
          <>
            <I d="upload" size={compact ? 18 : 26} color={c.b} />
            <Txt style={{ fontWeight: '700', textAlign: 'center', flexShrink: 1 }}>{label ?? 'Add a bank statement, screenshots or an export'}</Txt>
            {!compact && <Txt style={{ color: c.muted, fontSize: 12, textAlign: 'center' }}>PDF, screenshot (PNG, JPG), Excel (.xlsx) or CSV · up to 10 files, 20 MB each</Txt>}
          </>
        )}
      </Pressable>
      {result && (
        <Txt style={{ padding: 10, borderRadius: 10, overflow: 'hidden', fontSize: 13.5, backgroundColor: result.error || (!result.added && result.notes.length) ? c.negBg : c.bt, color: result.error || (!result.added && result.notes.length) ? c.neg : c.ink }}>
          {result.error ?? (result.added ? `${result.added} ${result.added === 1 ? 'transaction' : 'transactions'} added${result.skipped ? `, ${result.skipped} already there` : ''}.` : '')} {result.notes.join(' ')}
        </Txt>
      )}
      <Sheet open={choosing} onClose={() => setChoosing(false)} title="Add statements">
        <Btn onPress={fromPhotos}>
          <I d="camera" size={16} color={c.onB} />
          <BtnText>Screenshots from Photos</BtnText>
        </Btn>
        <Btn variant="ghost" onPress={fromFiles}>
          <I d="file" size={16} color={c.ink} />
          <BtnText variant="ghost">PDF, Excel or CSV from Files</BtnText>
        </Btn>
      </Sheet>
    </View>
  );
}
