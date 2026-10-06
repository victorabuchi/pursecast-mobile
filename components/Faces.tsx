import { Pressable, View } from 'react-native';
import { MOODS } from '../lib/money/worth';
import { useTheme } from '../lib/theme-context';
import MoodIcon from './MoodIcon';

// Loved it, fine, regret it for one purchase: each face rates it.
export default function Faces({ mood, small, onRate, disabled }: { mood: string | null; small?: boolean; onRate: (mood: string) => void; disabled?: boolean }) {
  const { c } = useTheme();
  const box = small ? 32 : 38;
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {MOODS.map(([m, label]) => {
        const on = mood === m;
        const dim = Boolean(mood) && !on;
        return (
          <Pressable
            key={m}
            onPress={() => onRate(m)}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: on }}
            style={{ width: box, height: box, alignItems: 'center', justifyContent: 'center', borderWidth: on ? 1 : 1, borderColor: on ? c.b : c.line, borderRadius: 11, backgroundColor: on ? c.bt : c.card, opacity: dim ? 0.3 : 1 }}
          >
            <MoodIcon mood={m} size={small ? 18 : 22} />
          </Pressable>
        );
      })}
    </View>
  );
}
