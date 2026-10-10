import { useRouter, usePathname } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { useShell, useGo } from '../lib/shell-context';
import { possessive, ago } from '../lib/money/dates';
import { exact } from '../lib/money/format';
import { useTheme } from '../lib/theme-context';
import { webUrl } from '../lib/api-client';
import { useRunner } from '../lib/use-page';
import Faces from './Faces';
import I, { type IconName } from './Icon';
import Mark from './Mark';
import Palette from './tools/Palette';
import { useTools } from '../lib/tools-context';
import Svg, { Path, Rect } from 'react-native-svg';
import PopoverMenu, { PopHead, PopItem } from './PopoverMenu';
import { Txt } from './ui';

const REMINDER_ICON = { todo: 'check', bill: 'repeat', debt: 'user', storm: 'storm', pay: 'wallet', bank: 'bank' } as const;

// The top bar of every signed-in page (.top): the mark, "Personal", then the
// setup button, notifications and the account menu.
export default function TopBar() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const path = usePathname();
  const go = useGo();
  const { logout } = useAuth();
  const { shell, refreshShell } = useShell();
  const { run } = useRunner(refreshShell);
  // On a phone there is no room for the "/ Personal" label beside six buttons.
  const wide = useWindowDimensions().width >= 600;
  const tools = useTools();
  const [search, setSearch] = useState(false);
  const bell = shell?.bell ?? [];
  const reminders = shell?.reminders ?? [];
  const count = bell.length + reminders.length;
  const icon = { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.line, borderRadius: 9, backgroundColor: c.card } as const;
  const onSetup = path.startsWith('/setup');
  const photo = shell?.photo ? (shell.photo.startsWith('/') ? webUrl(shell.photo) : shell.photo) : null;

  // First-time setup is a quiet page of its own: the mark and "Set up".
  if (shell && !shell.setUp) {
    return (
      <View style={{ paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.glass }}>
        <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 }}>
          <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: c.b, alignItems: 'center', justifyContent: 'center' }}>
            <Mark size={20} />
          </View>
          <Txt style={{ color: '#c4cad3' }}>/</Txt>
          <Txt style={{ fontWeight: '700' }}>Set up</Txt>
        </View>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: insets.top, borderBottomWidth: 1, borderBottomColor: c.line, backgroundColor: c.glass }}>
      <View style={{ height: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 }}>
        <Pressable onPress={() => router.navigate('/forecast')} accessibilityLabel="Pursecast home" style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: c.b, alignItems: 'center', justifyContent: 'center' }}>
          <Mark size={20} />
        </Pressable>
        {wide && <Txt style={{ color: '#c4cad3' }}>/</Txt>}
        {wide && <Txt style={{ fontWeight: '700' }}>Personal</Txt>}
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
          <Pressable
            onPress={() => router.navigate('/setup')}
            accessibilityRole="button"
            accessibilityLabel="Edit setup"
            accessibilityState={{ selected: onSetup }}
            style={{ ...icon, borderColor: onSetup ? c.b : c.line, backgroundColor: onSetup ? c.bt : c.card }}
          >
            <I d="sliders" size={16} color={c.b} />
          </Pressable>

          <Pressable onPress={() => tools.toggle('calculator')} accessibilityRole="button" accessibilityLabel="Calculator" accessibilityState={{ selected: tools.open.calculator }} style={{ ...icon, ...(tools.open.calculator ? { borderColor: c.b, backgroundColor: c.bt } : null) }}>
            <Svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke={c.muted} strokeWidth={2} strokeLinecap="round">
              <Rect x={5} y={2.5} width={14} height={19} rx={3} />
              <Path d="M8.5 6.5h7M9 11h.01M12 11h.01M15 11h.01M9 14.5h.01M12 14.5h.01M15 14.5h.01M9 18h.01M12 18h.01M15 18h.01" />
            </Svg>
          </Pressable>
          <Pressable onPress={() => tools.toggle('note')} accessibilityRole="button" accessibilityLabel="Note" accessibilityState={{ selected: tools.open.note }} style={{ ...icon, ...(tools.open.note ? { borderColor: c.b, backgroundColor: c.bt } : null) }}>
            <Svg viewBox="0 0 24 24" width={17} height={17} fill="none" stroke={c.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
              <Path d="M14 3v6h6M8 13h8M8 17h5" />
            </Svg>
          </Pressable>
          <PopoverMenu
            label={count ? `${count} notifications` : 'Notifications'}
            wide
            buttonStyle={icon}
            button={
              <>
                <I d="bell" color={count ? c.ink : c.muted} />
                {count > 0 && <View style={{ position: 'absolute', top: 6, right: 7, width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5484d', borderWidth: 2, borderColor: c.card }} />}
              </>
            }
          >
            {(close) => (
              <>
                {reminders.length > 0 && (
                  <>
                    <PopHead title="Reminders" sub="For today and the next few days." />
                    {reminders.map((r) => {
                      const tone = r.kind === 'bill' ? { bg: c.soft, fg: c.ink2 } : r.kind === 'debt' ? { bg: c.negBg2, fg: c.neg } : r.kind === 'storm' ? { bg: c.violetBg, fg: '#7c3aed' } : r.kind === 'pay' || r.kind === 'todo' ? { bg: c.posBg, fg: c.pos } : { bg: c.b, fg: c.onB };
                      return (
                        <Pressable key={r.key} onPress={() => (close(), go(r.href))} style={{ flexDirection: 'row', gap: 12, padding: 10, borderRadius: 12 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 9, backgroundColor: tone.bg, alignItems: 'center', justifyContent: 'center' }}>
                            <I d={REMINDER_ICON[r.kind] as IconName} size={16} color={tone.fg} />
                          </View>
                          <View style={{ flex: 1, gap: 2 }}>
                            <Txt style={{ fontWeight: '700' }}>{r.title}</Txt>
                            <Txt style={{ color: c.muted, fontSize: 12 }}>{r.body}</Txt>
                          </View>
                        </Pressable>
                      );
                    })}
                  </>
                )}
                <PopHead title="Was it worth it?" sub={bell.length ? 'Rate a purchase with one tap.' : 'Nothing to rate right now.'} />
                {bell.map((b) => (
                  <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: c.line }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Txt style={{ fontWeight: '700', fontSize: 13.5, lineHeight: 18 }} numberOfLines={2}>
                        Was {possessive(b.date, shell!.today)} {b.note.toLowerCase()} worth it?
                      </Txt>
                      <Txt style={{ color: c.muted, fontSize: 12 }} numberOfLines={1}>
                        {exact(Math.abs(b.amount), shell!.currency)}
                        {b.category ? ` · ${b.category}` : ''} · {ago(b.date, shell!.today)}
                      </Txt>
                    </View>
                    <Faces mood={null} small onRate={(mood) => void run('rateAction', { form: { id: b.id, mood, back: '/worth-it' } })} />
                  </View>
                ))}
                {bell.length > 0 && (
                  <PopItem icon={<I d="heart" color={c.muted} />} onPress={() => (close(), router.navigate('/worth-it'))}>
                    Open Worth-It
                  </PopItem>
                )}
              </>
            )}
          </PopoverMenu>

          <Pressable onPress={() => setSearch(true)} accessibilityRole="button" accessibilityLabel="Search" style={icon}>
            <I d="search" color={c.muted} />
          </Pressable>
          <PopoverMenu
            label="Account"
            buttonStyle={{ ...icon, borderRadius: 18, overflow: 'hidden' }}
            button={photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} /> : <I d="user" size={17} color={c.muted} />}
          >
            {(close) => (
              <>
                <PopHead title={shell?.name ?? ''} sub={shell?.email ?? ''} />
                <PopItem icon={<I d="edit" color={c.muted} />} onPress={() => (close(), router.navigate('/setup'))}>
                  Edit setup
                </PopItem>
                <PopItem icon={<I d="gear" color={c.muted} />} onPress={() => (close(), router.navigate('/settings'))}>
                  Settings
                </PopItem>
                <PopItem icon={<I d="repeat" color={c.muted} />} onPress={() => (close(), router.navigate('/spending?tab=bills'))}>
                  Bills and income
                </PopItem>
                <PopItem
                  icon={<I d="out" color={c.muted} />}
                  onPress={() => {
                    close();
                    void logout();
                  }}
                >
                  Log out
                </PopItem>
              </>
            )}
          </PopoverMenu>
        </View>
      </View>
      <Palette open={search} onClose={() => setSearch(false)} items={shell?.palette ?? []} />
    </View>
  );
}
