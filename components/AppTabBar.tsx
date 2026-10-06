import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShell } from '../lib/shell-context';
import { useTheme } from '../lib/theme-context';
import I, { type IconName } from './Icon';
import { Txt } from './ui';

// The phone tab bar (.tabs): the same six pages as the web's navigation.
export const NAV: Array<[IconName, string, string]> = [
  ['sun', 'Forecast', 'forecast'],
  ['list', 'Spending', 'spending'],
  ['heart', 'Worth-It', 'worth-it'],
  ['fork', 'Forks', 'forks'],
  ['cal', 'Plan', 'plan'],
  ['file', 'Statements', 'statements'],
];

export const tabsHeight = (bottomInset: number) => 64 + bottomInset;

export default function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { shell } = useShell();
  const active = state.routes[state.index]?.name;
  // No tab bar on the first-time setup page.
  if (shell && !shell.setUp) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', height: tabsHeight(insets.bottom), paddingTop: 8, paddingHorizontal: 4, paddingBottom: insets.bottom, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.glass }}>
      {NAV.map(([icon, label, route]) => {
        const on = active === route;
        return (
          <Pressable key={route} onPress={() => navigation.navigate(route)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={{ flex: 1, alignItems: 'center', gap: 3 }}>
            <I d={icon} size={20} color={on ? c.b : c.muted} />
            <Txt style={{ fontSize: 11, color: on ? c.b : c.muted, fontWeight: on ? '700' : '400' }}>{label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}
