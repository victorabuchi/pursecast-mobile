import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Faces from '../../components/Faces';
import Grad from '../../components/Grad';
import I from '../../components/Icon';
import MoodIcon from '../../components/MoodIcon';
import Screen from '../../components/Screen';
import { DateField, Meter } from '../../components/forms';
import { Btn, BtnText, Card, CardHead, CardSub, CardTitle, ConfirmX, Empty, Field, Input, LinkBtn, Note, PageHead, Pill, Select, Sheet, SheetActions, Small, TipCard, Txt, tabular } from '../../components/ui';
import { addDays, relative, short, weekday } from '../../lib/money/dates';
import { exact, money } from '../../lib/money/format';
import { adviceFor, isMood, joyByCategory, RATE_AFTER_DAYS, type Rated } from '../../lib/money/worth';
import { useShell } from '../../lib/shell-context';
import { useTheme } from '../../lib/theme-context';
import type { WorthData } from '../../lib/types';
import { usePage, useRunner } from '../../lib/use-page';
import { MAX_SECONDS, useVoiceRecorder, VoicePlayer } from '../../lib/voice';

export default function WorthScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ note?: string }>();
  const { refreshShell } = useShell();
  const [showAll, setShowAll] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const { data, error, loading, reload } = usePage<WorthData>('worth-it');
  const { run, busy } = useRunner(async () => {
    await Promise.all([reload(), refreshShell()]);
  });
  useEffect(() => {
    if (params.note) setNoteOpen(true);
  }, [params.note]);

  if (!data) return <Screen error={error} loading={loading} onRefresh={reload} refreshing={false}>{null}</Screen>;
  const { me, cats, entries } = data.money;
  const cur = me.currency;
  const catById = new Map(cats.map((x) => [x.id, x]));
  const rateable = (e: (typeof entries)[number]) => e.amount < 0 && !e.debtId && (!e.categoryId || catById.get(e.categoryId)?.kind === 'flex');

  const readyBy = addDays(me.today, -RATE_AFTER_DAYS);
  const window = entries.filter((e) => rateable(e) && e.date >= addDays(me.today, -30));
  const ready = window.filter((e) => e.date <= readyBy);
  const toRate = [...ready.filter((e) => !e.mood), ...ready.filter((e) => e.mood)].slice(0, showAll ? 40 : 6);
  const soon = window.filter((e) => e.date > readyBy && !e.mood);

  const rated: Rated[] = entries
    .filter((e) => rateable(e) && isMood(e.mood) && e.date >= addDays(me.today, -90))
    .map((e) => ({ categoryId: e.categoryId, categoryName: e.categoryId ? (catById.get(e.categoryId)?.name ?? 'Other') : 'No category', amount: e.amount, mood: e.mood as Rated['mood'], date: e.date }));
  const joy = joyByCategory(rated);
  const advice = adviceFor(
    joy,
    cats.filter((x) => x.kind === 'flex').map((x) => ({ id: x.id, name: x.name, budget: x.budget })),
    new Set(data.movedFrom),
  );
  const loved = rated.filter((r) => r.mood === 'love').length;
  const flexCats = cats.filter((x) => x.kind === 'flex').map((x) => ({ id: x.id, name: x.name }));

  return (
    <Screen error={error} onRefresh={reload} refreshing={false}>
      <PageHead title="Worth-It" sub="Rated two days later" icon="heart" right={<Pill>Joy per euro</Pill>} />

      <Card>
        <CardHead>
          <CardTitle>Was it worth it?</CardTitle>
          <CardSub>{ready.filter((e) => !e.mood).length} to rate</CardSub>
        </CardHead>
        {toRate.length === 0 && (
          <Empty>
            <Txt style={{ fontWeight: '700' }}>Nothing to rate yet.</Txt>
            <Txt style={{ color: c.muted }}>Purchases show up here {RATE_AFTER_DAYS} days after you log them, when you know whether they were worth it.</Txt>
            <LinkBtn onPress={() => router.navigate('/spending?add=1')}>Log a purchase</LinkBtn>
          </Empty>
        )}
        {toRate.map((e) => (
          <View key={e.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.line }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt style={{ fontWeight: '700' }} numberOfLines={1}>
                {e.note}
              </Txt>
              <Small>
                {relative(e.date, me.today).length <= 3 ? weekday(e.date) : relative(e.date, me.today)} · {e.categoryId ? (catById.get(e.categoryId)?.name ?? 'Other') : 'No category'}
              </Small>
            </View>
            <Txt style={[{ fontWeight: '700' }, tabular]}>{exact(-e.amount, cur)}</Txt>
            <Faces mood={e.mood} onRate={(mood) => void run('rateAction', { form: { id: e.id, mood, back: '/worth-it' } })} disabled={busy} />
          </View>
        ))}
        {!showAll && ready.length > toRate.length && <LinkBtn onPress={() => setShowAll(true)}>{`Show all ${ready.length}`}</LinkBtn>}
        {soon.length > 0 && (
          <Note>
            {soon.length} more {soon.length === 1 ? 'purchase' : 'purchases'} from the last {RATE_AFTER_DAYS} days will be ready to rate soon. The bell tells you.
          </Note>
        )}
      </Card>

      {advice && (
        <Grad from={c.warnBg} to={c.card} style={{ borderRadius: 14, borderWidth: 1, borderColor: c.warnLine }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 14, padding: 18 }}>
            <View style={{ width: 42, height: 42, borderRadius: 11, backgroundColor: c.warnBg2, alignItems: 'center', justifyContent: 'center' }}>
              <I d="bulb" size={20} color="#d97706" />
            </View>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Txt style={{ fontWeight: '700' }}>Budget by value</Txt>
              <Txt style={{ color: c.muted, fontSize: 13, lineHeight: 19.5, marginTop: 4, marginBottom: 8 }}>
                You regretted {advice.from.name.toLowerCase()} {advice.regrets} of your last {advice.of} times. Move {money(advice.amount, cur)} a month to {advice.to.name.toLowerCase()}?
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <Txt style={{ fontSize: 13, fontWeight: '600' }}>
                  {advice.from.name} <Txt style={{ color: c.muted, fontSize: 13, textDecorationLine: 'line-through' }}>{money(advice.from.budget, cur)}</Txt> <Txt style={{ color: c.b, fontSize: 13, fontWeight: '700' }}>{money(advice.from.budget - advice.amount, cur)}</Txt>
                </Txt>
                <I d="arrow" size={14} color={c.ink} />
                <Txt style={{ fontSize: 13, fontWeight: '600' }}>
                  {advice.to.name} <Txt style={{ color: c.muted, fontSize: 13, textDecorationLine: 'line-through' }}>{money(advice.to.budget, cur)}</Txt> <Txt style={{ color: c.b, fontSize: 13, fontWeight: '700' }}>{money(advice.to.budget + advice.amount, cur)}</Txt>
                </Txt>
              </View>
            </View>
            <Btn busy={busy} onPress={() => void run('moveValueAction', { form: { from: advice.from.id, to: advice.to.id, amount: String(advice.amount / 100) } })}>
              {`Move ${money(advice.amount, cur)}`}
            </Btn>
          </View>
        </Grad>
      )}
      {!advice && rated.length > 0 && (
        <TipCard>
          <Txt style={{ fontWeight: '700', fontSize: 13.5 }}>Keep rating.</Txt> After a few ratings in the same category, Pursecast suggests moving money from what you regret to what you love.
        </TipCard>
      )}

      <Card>
        <CardTitle>Joy per euro · 90 days</CardTitle>
        {joy.length === 0 && <Note>Rate a few purchases and your map of what is worth it appears here.</Note>}
        {joy.map((j) => (
          <View key={j.categoryId ?? 'none'} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Txt style={{ fontSize: 13 }}>{j.name}</Txt>
              <Txt style={[{ fontSize: 13, fontWeight: '700' }, tabular]}>{j.score.toFixed(1)}</Txt>
            </View>
            <Meter pct={Math.max(3, j.score * 10)} color={j.score < 4 ? '#e5484d' : j.score < 6 ? '#f5a524' : undefined} />
          </View>
        ))}
      </Card>
      {rated.length > 0 && (
        <Card>
          <CardTitle>Your ratings</CardTitle>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
            <Note>
              {rated.length} {rated.length === 1 ? 'purchase' : 'purchases'} rated in 90 days ·{' '}
            </Note>
            <MoodIcon mood="love" size={15} />
            <Note>{Math.round((loved / rated.length) * 100)}% loved</Note>
          </View>
        </Card>
      )}

      <Card>
        <CardHead>
          <View style={{ flex: 1 }}>
            <CardTitle>Future-self notes</CardTitle>
            <CardSub>A note to yourself, played back before you spend where you have regretted it before.</CardSub>
          </View>
        </CardHead>
        <Btn small style={{ alignSelf: 'flex-start' }} onPress={() => setNoteOpen(true)}>
          <I d="mic" size={14} color={c.onB} />
          <BtnText small>New note</BtnText>
        </Btn>
        {data.notes.length === 0 && (
          <Empty>
            <Txt style={{ fontWeight: '700' }}>No notes yet.</Txt>
            <Txt style={{ color: c.muted }}>Saving for something? Tell future you, like "You're saving for Japan. Is this worth 2 days there?"</Txt>
          </Empty>
        )}
        {data.notes.map((n) => {
          const cat = n.categoryId ? catById.get(n.categoryId) : undefined;
          const ended = n.until && n.until < me.today;
          return (
            <View key={n.id} style={{ opacity: ended ? 0.55 : 1 }}>
              <Grad from={c.violetBg} to={c.card} style={{ borderRadius: 14, borderWidth: 1, borderColor: '#ddd6fe' }}>
                <View style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: c.violetBg, alignItems: 'center', justifyContent: 'center' }}>
                    <I d={n.audio ? 'mic' : 'heart'} size={18} color="#7c3aed" />
                  </View>
                  <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
                    <Txt style={{ fontSize: 15, fontWeight: '700', lineHeight: 21 }}>“{n.text}”</Txt>
                    {n.audio ? <VoicePlayer src={n.audio} /> : null}
                    <Small>
                      Before {cat ? cat.name.toLowerCase() : 'anything you tend to regret'}
                      {n.until ? ` · ${ended ? 'ended' : 'until'} ${short(n.until)}` : ''}
                    </Small>
                    <Small>
                      Played {n.shown} {n.shown === 1 ? 'time' : 'times'} · skipped {n.skipped} · {money(n.saved, cur)} kept
                    </Small>
                  </View>
                  <ConfirmX label="Remove note" icon="trash" onConfirm={() => void run('deleteNoteAction', { form: { id: n.id } })} />
                </View>
              </Grad>
            </View>
          );
        })}
      </Card>

      <NoteSheet open={noteOpen} onClose={() => setNoteOpen(false)} categories={flexCats} today={me.today} busy={busy} onSave={(form) => run('createNoteAction', { form }).then((ok) => ok && setNoteOpen(false))} />
    </Screen>
  );
}

// Text plus an optional voice recording, kept as a data: URL.
function NoteSheet({ open, onClose, categories, today, busy, onSave }: { open: boolean; onClose: () => void; categories: Array<{ id: string; name: string }>; today: string; busy: boolean; onSave: (form: Record<string, string>) => void }) {
  const { c } = useTheme();
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [until, setUntil] = useState('');
  const voice = useVoiceRecorder();
  useEffect(() => {
    if (!open) {
      setText('');
      setCategoryId('');
      setUntil('');
      voice.clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title="A note to future you" sub="Write it, or say it. You will hear it at the right moment.">
      <View style={{ gap: 3, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 2, borderColor: c.b, borderRadius: 13 }}>
        <Txt style={{ color: c.muted, fontSize: 12, fontWeight: '700' }}>Dear future me…</Txt>
        <Input value={text} onChangeText={setText} placeholder="You're saving for Japan. Is this worth 2 days there?" maxLength={280} autoFocus multiline style={{ minHeight: 0, padding: 0, borderWidth: 0, backgroundColor: 'transparent', fontSize: 18, fontWeight: '700' }} />
      </View>
      <Field label="Say it in your own voice" hint="Optional. Up to a minute. It plays back with the note.">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {voice.recording ? (
            <Btn variant="danger" onPress={() => void voice.stop()}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#e5484d' }} />
              <BtnText variant="danger">{`Stop · ${MAX_SECONDS - voice.seconds}s left`}</BtnText>
            </Btn>
          ) : (
            <Btn variant="ghost" onPress={() => void voice.start()}>
              <I d="mic" size={16} color={c.ink} />
              <BtnText variant="ghost">{voice.audio ? 'Record again' : 'Record'}</BtnText>
            </Btn>
          )}
          {voice.audio && !voice.recording ? (
            <>
              <View style={{ flex: 1, minWidth: 160 }}>
                <VoicePlayer src={voice.audio} />
              </View>
              <Pressable onPress={voice.clear} accessibilityLabel="Remove recording" style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                <I d="x" size={14} color={c.muted} />
              </Pressable>
            </>
          ) : null}
        </View>
        {voice.error ? <Txt style={{ color: c.neg, fontSize: 12 }}>{voice.error}</Txt> : null}
      </Field>
      <Field label="Play it before spending on">
        <Select value={categoryId} onChange={setCategoryId} label="Category" options={[{ id: '', label: 'Anything I tend to regret' }, ...categories.map((x) => ({ id: x.id, label: x.name }))]} />
      </Field>
      <Field label="Until (optional, like the day of your trip)">
        <DateField value={until} onChange={setUntil} min={today} clearable label="Until" placeholder="No end date" />
      </Field>
      <SheetActions>
        <Btn variant="ghost" onPress={onClose}>
          Cancel
        </Btn>
        <Btn style={{ flex: 1 }} busy={busy} onPress={() => onSave({ text, audio: voice.audio, categoryId, until })}>
          Save note
        </Btn>
      </SheetActions>
    </Sheet>
  );
}
