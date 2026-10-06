import { useEffect, useRef, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useTheme } from '../lib/theme-context';
import { Txt } from './ui';

// A page: the .main column (18 / 16 padding, 14 gap) on the page background,
// pull down to reload.
export default function Screen({ children, onRefresh, refreshing, error, loading, scrollToY, footer }: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; error?: string; loading?: boolean; scrollToY?: number | null; footer?: ReactNode }) {
  const { c } = useTheme();
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    if (scrollToY !== null && scrollToY !== undefined) ref.current?.scrollTo({ y: Math.max(0, scrollToY - 8), animated: true });
  }, [scrollToY]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView
      ref={ref}
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ gap: 14, paddingTop: 18, paddingHorizontal: 16, paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={c.b} /> : undefined}
    >
      {error ? (
        <View style={{ padding: 14, borderRadius: 12, backgroundColor: c.negBg, borderWidth: 1, borderColor: c.negLine }}>
          <Txt style={{ color: c.neg, fontWeight: '600' }}>{error}</Txt>
        </View>
      ) : null}
      {loading ? null : children}
    </ScrollView>
      {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>{footer}</View> : null}
    </View>
  );
}
