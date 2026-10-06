import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import I from '../../components/Icon';
import Screen from '../../components/Screen';
import { Btn, BtnText, Card, CardHead, CardSub, CardTitle, Input, LinkBtn, Note, PageHead, Select, Small, Txt, tabular, useToast } from '../../components/ui';
import * as api from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { ago, short, todayIn } from '../../lib/money/dates';
import { exact } from '../../lib/money/format';
import { useShell } from '../../lib/shell-context';
import { useTheme } from '../../lib/theme-context';
import type { BankInfo, BanksData } from '../../lib/types';
import { useRunner } from '../../lib/use-page';

const ZONE_COUNTRY: Record<string, string> = {
  'Europe/Helsinki': 'FI',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Madrid': 'ES',
  'Europe/Lisbon': 'PT',
  'Europe/Warsaw': 'PL',
};

const COUNTRIES: Array<[string, string]> = [
  ['FI', 'Finland'],
  ['SE', 'Sweden'],
  ['NO', 'Norway'],
  ['DK', 'Denmark'],
  ['EE', 'Estonia'],
  ['LV', 'Latvia'],
  ['LT', 'Lithuania'],
  ['DE', 'Germany'],
  ['NL', 'Netherlands'],
  ['BE', 'Belgium'],
  ['FR', 'France'],
  ['ES', 'Spain'],
  ['PT', 'Portugal'],
  ['IT', 'Italy'],
  ['AT', 'Austria'],
  ['IE', 'Ireland'],
  ['PL', 'Poland'],
  ['GR', 'Greece'],
];

const ROLES: Array<[string, string]> = [
  ['main', 'Main account'],
  ['counted', 'Other account, in forecast'],
  ['other', 'Other account, not counted'],
  ['off', 'Don’t use'],
];

// Whole days until an ISO time (negative once it has passed).
const daysUntil = (iso: string): number => Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000);

// Connected banks: balances and transactions that update by themselves.
export default function BanksScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ add?: string; toast?: string; error?: string }>();
  const { logout } = useAuth();
  const { refreshShell } = useShell();
  const [data, setData] = useState<BanksData | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.getBanks());
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
  const { run, runFull, busy } = useRunner(async () => {
    await Promise.all([load(), refreshShell()]);
  });
  useEffect(() => {
    if (params.add) setAdding(true);
  }, [params.add]);
  // A connection finished while the app was reopened by the bank's page.
  useEffect(() => {
    if (params.toast) toast.show(params.toast);
    else if (params.error) toast.show(params.error, true);
    if (params.toast || params.error) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toast, params.error]);

  if (!data) return <Screen error={error} loading={!error} onRefresh={load} refreshing={false}>{null}</Screen>;
  const { me, ready, links, accounts, app } = data;
  const showAdding = adding || links.length === 0;

  // Goes to the bank to approve, then back here.
  const connect = async (bank: BankInfo) => {
    const res = await runFull('connectBankAction', { form: { name: bank.name, country: bank.country, app: '1' } });
    const url = res?.redirect?.url;
    if (!url || !/^https?:\/\//i.test(url)) return;
    const result = await WebBrowser.openAuthSessionAsync(url, 'pursecast://banks');
    if (result.type === 'success') {
      const query = new URLSearchParams(result.url.split('?')[1] ?? '');
      if (query.get('toast')) toast.show(query.get('toast')!);
      else if (query.get('error')) toast.show(query.get('error')!, true);
      setAdding(false);
      await Promise.all([load(), refreshShell()]);
    } else {
      await load();
    }
  };

  return (
    <Screen error={error} onRefresh={load} refreshing={false}>
      <PageHead
        title="Banks"
        sub="Balances and transactions, by themselves"
        icon="bank"
        right={
          links.length > 0 && !showAdding ? (
            <Btn small onPress={() => setAdding(true)}>
              <I d="plus" size={14} stroke={2.6} color={c.onB} />
              <BtnText small>Connect a bank</BtnText>
            </Btn>
          ) : null
        }
      />

      {!ready && (
        <Card>
          <CardTitle>Bank connections are not set up yet</CardTitle>
          <Note>{data.setupProblem} Until then, upload statements or exports on the Statements page.</Note>
        </Card>
      )}

      {ready && app.error ? (
        <Card style={{ borderColor: c.negLine }}>
          <CardTitle>Enable Banking did not accept the server’s key</CardTitle>
          <Note>{app.error}. Check that ENABLE_BANKING_APP_ID and the private key on the server belong to the same application (the key file named after the ID).</Note>
        </Card>
      ) : null}

      {ready && app.environment === 'SANDBOX' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: c.warnLine, borderRadius: 12, backgroundColor: c.warnBg }}>
          <I d="bulb" size={15} color="#d97706" />
          <Txt style={{ flex: 1, fontSize: 13.5 }}>
            Test mode: these are practice banks with made-up money. Try <Txt style={{ fontWeight: '700', fontSize: 13.5 }}>S-Pankki</Txt> and sign in as <Txt style={{ fontWeight: '700', fontSize: 13.5 }}>customera</Txt>, password <Txt style={{ fontWeight: '700', fontSize: 13.5 }}>12345678</Txt>.
          </Txt>
        </View>
      )}

      {ready && showAdding && (
        <Card>
          <CardHead>
            <View style={{ flex: 1 }}>
              <CardTitle>Connect your bank</CardTitle>
              <CardSub>Your balance and transactions come in by themselves. Read-only: Pursecast can never move money.</CardSub>
            </View>
            {links.length > 0 && <LinkBtn onPress={() => setAdding(false)}>Cancel</LinkBtn>}
          </CardHead>
          <BankPicker country={ZONE_COUNTRY[me.timezone] ?? 'FI'} onConnect={connect} busy={busy} />
        </Card>
      )}

      {links.map((l) => {
        const mine = accounts.filter((a) => a.linkId === l.id);
        const daysLeft = l.validUntil ? daysUntil(l.validUntil) : null;
        const expired = l.status === 'expired' || (daysLeft !== null && daysLeft <= 0);
        return (
          <Card key={l.id}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
              {l.logo ? <Image source={{ uri: l.logo }} style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' }} resizeMode="contain" /> : <View style={{ width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: '#fff' }} />}
              <View style={{ flex: 1, minWidth: 180 }}>
                <Txt style={{ fontWeight: '700' }}>{l.aspspName}</Txt>
                <Small>
                  {expired ? 'Connection ended · connect again to keep it updated' : l.status === 'error' ? (l.error ?? 'The last update failed') : l.lastSyncAt ? `Updated ${ago(todayIn(me.timezone, new Date(l.lastSyncAt)), me.today)}` : 'Connected'}
                  {!expired && daysLeft !== null ? ` · access until ${short(l.validUntil!.slice(0, 10))}${daysLeft <= 14 ? ` (${daysLeft} days)` : ''}` : ''}
                </Small>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {expired ? (
                  <Btn small onPress={() => setAdding(true)}>
                    Connect again
                  </Btn>
                ) : (
                  <Btn variant="ghost" small busy={busy} onPress={() => void run('syncBankAction', { form: { id: l.id } })}>
                    <I d="refresh" size={14} color={c.ink} />
                    <BtnText variant="ghost" small>Update now</BtnText>
                  </Btn>
                )}
                <LinkBtn onPress={() => void run('disconnectBankAction', { form: { id: l.id } })}>Disconnect</LinkBtn>
              </View>
            </View>
            {mine.map((a) => (
              <View key={a.id} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.line }}>
                <View style={{ flex: 1, minWidth: 180, opacity: a.role === 'off' ? 0.5 : 1 }}>
                  <BankName id={a.id} name={a.name} run={run} />
                  <Small>
                    {a.iban ? `•• ${a.iban.replace(/\s/g, '').slice(-4)} · ` : ''}
                    {a.currency}
                  </Small>
                </View>
                <Txt style={[{ fontWeight: '700', opacity: a.role === 'off' ? 0.5 : 1 }, tabular]}>{a.balance !== null ? exact(a.balance, a.currency) : '—'}</Txt>
                <View style={{ flexBasis: 240, flexGrow: 1 }}>
                  <Select value={a.role} onChange={(role) => void run('setBankRoleAction', { args: [a.id, role] })} label={`${a.name}: use as`} options={ROLES.map(([id, label]) => ({ id, label }))} />
                </View>
              </View>
            ))}
            {mine.length === 0 && <Note>No accounts were shared. Connect again and choose the accounts to share.</Note>}
          </Card>
        );
      })}

      {links.length > 0 && (
        <Note style={{ textAlign: 'center' }}>
          The main account sets the balance Money Weather starts from. Transactions go to{' '}
          <Txt onPress={() => router.navigate('/statements')} style={{ color: c.b, fontWeight: '700', fontSize: 13 }}>
            Statements
          </Txt>
          , where regular charges can become subscriptions in one tap. Banks update a few times a day.
        </Note>
      )}
    </Screen>
  );
}

// A linked account's name, editable in place ("Revolut Pro").
function BankName({ id, name, run }: { id: string; name: string; run: ReturnType<typeof useRunner>['run'] }) {
  const { c } = useTheme();
  const [value, setValue] = useState(name);
  useEffect(() => setValue(name), [name]);
  const save = () => {
    const v = value.trim();
    if (!v || v === name) return setValue(name);
    void run('renameBankAccountAction', { args: [id, v] });
  };
  return <TextInput value={value} onChangeText={setValue} onBlur={save} onSubmitEditing={save} maxLength={60} accessibilityLabel="Account name" style={{ padding: 0, color: c.ink, fontFamily: 'Figtree_700Bold', fontSize: 14 }} />;
}

// Pick a country, find your bank, and go approve the connection there.
function BankPicker({ country: initial, onConnect, busy }: { country: string; onConnect: (bank: BankInfo) => void; busy: boolean }) {
  const { c } = useTheme();
  const [country, setCountry] = useState(initial);
  const [banks, setBanks] = useState<BankInfo[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<BankInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .action<{ banks: BankInfo[]; error?: string }>('banksAction', { args: [country] })
      .then((res) => {
        if (!live) return;
        setBanks(res.result?.banks ?? []);
        setError(res.result?.error ?? '');
        setPicked(null);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'The bank list could not load.'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [country]);

  const shown = (banks ?? []).filter((b) => b.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <View style={{ gap: 12 }}>
      <Select value={country} onChange={setCountry} label="Country" options={COUNTRIES.map(([id, label]) => ({ id, label }))} />
      <Input value={q} onChangeText={setQ} placeholder="Search for your bank" accessibilityLabel="Search banks" autoCorrect={false} />
      <ScrollView nestedScrollEnabled style={{ maxHeight: 420 }} contentContainerStyle={{ gap: 8, padding: 2 }}>
        {error ? (
          <Txt style={{ color: c.neg }}>The bank list could not load: {error}</Txt>
        ) : banks === null || loading ? (
          <Note>Loading banks…</Note>
        ) : shown.length === 0 ? (
          <Note>No bank by that name here.</Note>
        ) : (
          shown.slice(0, 60).map((b) => (
            <Pressable key={b.name} onPress={() => setPicked(b)} accessibilityRole="button" accessibilityState={{ selected: picked?.name === b.name }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 8, paddingHorizontal: 12, borderWidth: picked?.name === b.name ? 1 : 1, borderColor: picked?.name === b.name ? c.b : c.line, borderRadius: 12, backgroundColor: c.card }}>
              <Image source={{ uri: b.logo }} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fff' }} resizeMode="contain" />
              <Txt style={{ flex: 1, fontWeight: '700' }}>{b.name}</Txt>
              {b.beta && <Txt style={{ color: c.muted, fontSize: 11 }}>beta</Txt>}
            </Pressable>
          ))
        )}
      </ScrollView>
      {picked && (
        <View style={{ gap: 12, padding: 14, borderRadius: 12, backgroundColor: c.bt }}>
          <Txt style={{ fontSize: 13.5 }}>
            You go to <Txt style={{ fontWeight: '700', fontSize: 13.5 }}>{picked.name}</Txt> to approve. Pursecast can then read balances and transactions, never move money. Access lasts up to 180 days.
          </Txt>
          <Btn busy={busy} onPress={() => onConnect(picked)}>
            <I d="link" size={15} color={c.onB} />
            <BtnText>{`Connect ${picked.name}`}</BtnText>
          </Btn>
        </View>
      )}
    </View>
  );
}
