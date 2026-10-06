import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import EyeIcon from '../../components/EyeIcon';
import I from '../../components/Icon';
import Screen from '../../components/Screen';
import { Check, PhotoField, photoForm, type PhotoValue } from '../../components/forms';
import { Btn, BtnText, Card, CardTitle, Field, Input, Note, PageHead, Segment, Select, Txt, useToast } from '../../components/ui';
import * as api from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { notifyState, turnOffNotifications, turnOnNotifications, type NotifyState } from '../../lib/notify';
import { useShell } from '../../lib/shell-context';
import { useTheme } from '../../lib/theme-context';
import { useRunner } from '../../lib/use-page';
import { useFocusEffect } from 'expo-router';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'SEK', 'NOK', 'DKK', 'CHF', 'PLN', 'CAD', 'AUD', 'NGN', 'INR', 'JPY'];
const ZONES = ['Europe/Helsinki', 'Europe/Stockholm', 'Europe/Oslo', 'Europe/Copenhagen', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'Europe/Lisbon', 'Europe/London', 'Europe/Warsaw', 'Africa/Lagos', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
const MIN_PASSWORD_LENGTH = 10;

export default function SettingsScreen() {
  const { c, pref, setPref } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { logout, refreshMe } = useAuth();
  const { refreshShell } = useShell();
  const [data, setData] = useState<api.SettingsData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api.getSettings());
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
  const { run, busy } = useRunner(async () => {
    await Promise.all([load(), refreshShell(), refreshMe()]);
  });

  if (!data) return <Screen error={error} loading={!error} onRefresh={load} refreshing={false}>{null}</Screen>;
  const { me } = data;
  const zones = ZONES.includes(me.timezone) ? ZONES : [me.timezone, ...ZONES];

  return (
    <Screen error={error} onRefresh={load} refreshing={false}>
      <PageHead title="Settings" sub="Your account" icon="gear" />
      <Profile key={me.id + me.name + me.currency + me.timezone} me={me} zones={zones} run={run} busy={busy} />
      <Password hasPassword={data.hasPassword} run={run} busy={busy} />

      <Card>
        <CardTitle>Notifications</CardTitle>
        <Note>A nudge at 8 in the morning when pay lands with things to do, a bill or subscription is due tomorrow, a debt is due, or a storm is coming.</Note>
        <Notifications weeklyEmail={data.weeklyEmail} emailReady={data.emailReady} run={run} />
      </Card>

      <Card>
        <CardTitle>Appearance</CardTitle>
        <Note>Automatic follows your phone or computer, and turns dark from 7 pm to 7 am.</Note>
        <Segment
          options={[
            { id: 'system', label: 'Automatic', icon: 'sliders' },
            { id: 'light', label: 'Light', icon: 'sun' },
            { id: 'dark', label: 'Dark', icon: 'moon' },
          ]}
          value={pref}
          onChange={setPref}
        />
      </Card>

      <Card>
        <CardTitle>Connected banks</CardTitle>
        <Note>Your balance and transactions, updated by themselves. Read-only.</Note>
        <Btn variant="ghost" style={{ alignSelf: 'flex-start' }} onPress={() => router.navigate('/banks')}>
          Manage banks
        </Btn>
      </Card>
      <Card>
        <CardTitle>Your setup</CardTitle>
        <Note>Balance, pay, rent, bills, subscriptions, money you owe and budgets, all on one page.</Note>
        <Btn variant="ghost" style={{ alignSelf: 'flex-start' }} onPress={() => router.navigate('/setup')}>
          Edit setup
        </Btn>
      </Card>

      <Card>
        <CardTitle>Calendar</CardTitle>
        {me.calendarUrl ? (
          <>
            <Note>Plan ahead reads your calendar for costs.</Note>
            <Btn variant="ghost" busy={busy} style={{ alignSelf: 'flex-start' }} onPress={() => void run('disconnectCalendarAction')}>
              Disconnect calendar
            </Btn>
          </>
        ) : (
          <>
            <Note>Not connected. Plan ahead can read your calendar to find costs before they happen.</Note>
            <Btn variant="ghost" style={{ alignSelf: 'flex-start' }} onPress={() => router.navigate('/plan?calendar=1')}>
              Connect calendar
            </Btn>
          </>
        )}
      </Card>

      <Card>
        <CardTitle>Your data</CardTitle>
        <Note>Download everything Pursecast stores about you as a JSON file.</Note>
        <Btn
          variant="ghost"
          style={{ alignSelf: 'flex-start' }}
          onPress={async () => {
            try {
              const text = await api.exportData();
              const path = `${FileSystem.cacheDirectory}pursecast-${new Date().toISOString().slice(0, 10)}.json`;
              await FileSystem.writeAsStringAsync(path, text);
              if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export my data', UTI: 'public.json' });
              else toast.show('Sharing is not available on this device.', true);
            } catch (e) {
              toast.show(e instanceof Error ? e.message : 'Could not export your data. Try again.', true);
            }
          }}
        >
          Export my data
        </Btn>
      </Card>

      <Card>
        <CardTitle>Sign out</CardTitle>
        <Btn variant="ghost" style={{ alignSelf: 'flex-start' }} onPress={() => void logout()}>
          Log out
        </Btn>
      </Card>

      <DeleteAccount email={me.email} onDeleted={async () => (await logout(), router.replace('/login'))} run={run} busy={busy} />
    </Screen>
  );
}

function Profile({ me, zones, run, busy }: { me: api.SettingsData['me']; zones: string[]; run: ReturnType<typeof useRunner>['run']; busy: boolean }) {
  const [name, setName] = useState(me.name);
  const [currency, setCurrency] = useState(me.currency);
  const [timezone, setTimezone] = useState(me.timezone);
  const [photo, setPhoto] = useState<PhotoValue>({ photo: '', cleared: false });
  return (
    <Card>
      <CardTitle>Profile</CardTitle>
      <PhotoField current={me.photo} value={photo} onChange={setPhoto} label="Profile picture" round />
      <Field label="Name">
        <Input value={name} onChangeText={setName} maxLength={80} />
      </Field>
      <Field label="Email">
        <Input value={me.email} editable={false} style={{ opacity: 0.6 }} />
      </Field>
      <Field label="Currency">
        <Select value={currency} onChange={setCurrency} label="Currency" options={CURRENCIES.map((x) => ({ id: x, label: x }))} />
      </Field>
      <Field label="Time zone">
        <Select value={timezone} onChange={setTimezone} label="Time zone" options={zones.map((z) => ({ id: z, label: z.replace('_', ' ') }))} />
      </Field>
      <Btn busy={busy} style={{ alignSelf: 'flex-start' }} onPress={() => void run('updateProfileAction', { form: { name, currency, timezone, ...photoForm(photo) } })}>
        Save profile
      </Btn>
    </Card>
  );
}

function PasswordInput({ value, onChangeText, autoComplete }: { value: string; onChangeText: (v: string) => void; autoComplete: 'current-password' | 'new-password' }) {
  const { c } = useTheme();
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <Input value={value} onChangeText={onChangeText} secureTextEntry={!visible} autoComplete={autoComplete} autoCapitalize="none" autoCorrect={false} style={{ paddingRight: 48 }} />
      <Pressable onPress={() => setVisible((v) => !v)} accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} style={{ position: 'absolute', top: 2, right: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
        <EyeIcon off={visible} color={c.muted} />
      </Pressable>
    </View>
  );
}

function Password({ hasPassword, run, busy }: { hasPassword: boolean; run: ReturnType<typeof useRunner>['run']; busy: boolean }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  return (
    <Card>
      <CardTitle>{hasPassword ? 'Change password' : 'Set a password'}</CardTitle>
      {!hasPassword && <Note>You sign in with email links. Add a password to sign in without one.</Note>}
      {hasPassword && (
        <Field label="Current password">
          <PasswordInput value={current} onChangeText={setCurrent} autoComplete="current-password" />
        </Field>
      )}
      <Field label="New password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        <PasswordInput value={next} onChangeText={setNext} autoComplete="new-password" />
      </Field>
      <Btn
        variant="ghost"
        busy={busy}
        style={{ alignSelf: 'flex-start' }}
        onPress={async () => {
          if (await run('changePasswordAction', { form: { current, password: next } })) {
            setCurrent('');
            setNext('');
          }
        }}
      >
        {hasPassword ? 'Change password' : 'Set password'}
      </Btn>
    </Card>
  );
}

// Push notifications for this phone, and the Monday email.
function Notifications({ weeklyEmail, emailReady, run }: { weeklyEmail: boolean; emailReady: boolean; run: ReturnType<typeof useRunner>['run'] }) {
  const { c } = useTheme();
  const [state, setState] = useState<NotifyState>('loading');
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(false);
  const [weekly, setWeekly] = useState(weeklyEmail);
  useEffect(() => {
    void notifyState().then(setState);
  }, []);

  const turnOn = async () => {
    setPending(true);
    setMsg('');
    const res = await turnOnNotifications();
    setState(res.state);
    if (res.message) setMsg(res.message);
    setPending(false);
  };
  const turnOff = async () => {
    setPending(true);
    await turnOffNotifications();
    setState('off');
    setPending(false);
  };
  const test = async () => {
    setPending(true);
    const sent = await run('testPushAction');
    setMsg(sent ? 'Sent. It should show up in a few seconds.' : '');
    setPending(false);
  };

  return (
    <View style={{ gap: 12 }}>
      {state === 'unsupported' ? (
        <Note>This device cannot show notifications.</Note>
      ) : state === 'blocked' ? (
        <Note>Notifications are blocked for Pursecast. Allow them in your phone's Settings, then come back.</Note>
      ) : state === 'on' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <I d="check" size={15} stroke={2.6} color={c.pos} />
            <Txt style={{ color: c.pos, fontWeight: '700' }}>On for this device</Txt>
          </View>
          <Btn variant="ghost" small disabled={pending} onPress={test}>
            Send a test
          </Btn>
          <Pressable onPress={turnOff} disabled={pending}>
            <Txt style={{ color: c.muted, fontSize: 13, fontWeight: '700' }}>Turn off</Txt>
          </Pressable>
        </View>
      ) : (
        <Btn busy={pending} disabled={state === 'loading'} style={{ alignSelf: 'flex-start' }} onPress={turnOn}>
          <I d="bell" size={15} color={c.onB} />
          <BtnText>{pending ? 'Asking…' : 'Turn on notifications'}</BtnText>
        </Btn>
      )}
      {msg ? <Note>{msg}</Note> : null}
      <View style={{ opacity: emailReady ? 1 : 0.6 }} pointerEvents={emailReady ? 'auto' : 'none'}>
        <Check
          checked={weekly}
          onChange={(v) => {
            setWeekly(v);
            void run('setWeeklyEmailAction', { args: [v] });
          }}
        >
          Monday email: the week ahead, bills and what waits for payday
        </Check>
      </View>
      {!emailReady && <Note>Email needs Resend set up on the server.</Note>}
    </View>
  );
}

function DeleteAccount({ email, onDeleted, run, busy }: { email: string; onDeleted: () => void; run: ReturnType<typeof useRunner>['run']; busy: boolean }) {
  const { c } = useTheme();
  const [confirm, setConfirm] = useState('');
  return (
    <Card style={{ borderColor: c.negLine }}>
      <CardTitle>Delete account</CardTitle>
      <Note>Deletes your account and everything in it right away. This cannot be undone.</Note>
      <Field label={`Type ${email} to confirm`}>
        <Input value={confirm} onChangeText={setConfirm} autoCapitalize="none" autoCorrect={false} autoComplete="off" />
      </Field>
      <Btn
        variant="danger"
        busy={busy}
        style={{ alignSelf: 'flex-start' }}
        onPress={async () => {
          if (await run('deleteAccountAction', { form: { confirm } })) onDeleted();
        }}
      >
        Delete my account
      </Btn>
    </Card>
  );
}
