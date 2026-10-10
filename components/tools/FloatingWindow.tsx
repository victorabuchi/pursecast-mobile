import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard, PanResponder, Platform, View, useWindowDimensions, type GestureResponderHandlers } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTools, type ToolId } from '../../lib/tools-context';

// A window that floats over the app: dragged by its title bar, resized by the
// corner, remembered where it was left (the web's FloatWindow, for a phone).
type Rect = { x: number; y: number; w: number; h: number };
export type WindowParts = { width: number; height: number; dragProps: GestureResponderHandlers };

const KEY = (id: string) => `pursecast_win_${id}`;

export default function FloatingWindow({ id, open, keepMounted, minW, maxW, minH = 0, maxH = 4000, autoHeight, start, background, border, children }: { id: ToolId; open: boolean; keepMounted?: boolean; minW: number; maxW: number; minH?: number; maxH?: number; autoHeight?: boolean; start: (screen: { width: number; height: number; top: number }) => Rect; background: string; border: string; children: (parts: WindowParts) => ReactNode }) {
  const screen = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { z, front } = useTools();
  const bounds = { width: screen.width, height: screen.height, top: insets.top, bottom: insets.bottom };

  const [rect, setRectState] = useState<Rect>(() => start({ width: screen.width, height: screen.height, top: insets.top }));
  const [measured, setMeasured] = useState(0);
  const [keyboard, setKeyboard] = useState(0);
  const rectRef = useRef(rect);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  const measuredRef = useRef(0);
  measuredRef.current = measured;

  // Keeps the window on the screen, and its title bar always reachable.
  const clamp = (r: Rect): Rect => {
    const b = boundsRef.current;
    const w = Math.max(minW, Math.min(r.w, maxW, b.width - 16));
    const h = autoHeight ? 0 : Math.max(minH, Math.min(r.h, maxH, b.height - b.top - b.bottom - 16));
    const shownH = autoHeight ? measuredRef.current || 420 : h;
    return { w, h, x: Math.max(8, Math.min(r.x, b.width - w - 8)), y: Math.max(b.top + 8, Math.min(r.y, b.height - Math.min(shownH, 120) - 8)) };
  };
  const setRect = (r: Rect) => {
    const next = clamp(r);
    rectRef.current = next;
    setRectState(next);
  };
  const save = () => void SecureStore.setItemAsync(KEY(id), JSON.stringify(rectRef.current)).catch(() => undefined);

  useEffect(() => {
    SecureStore.getItemAsync(KEY(id))
      .then((saved) => {
        if (saved) setRect(JSON.parse(saved) as Rect);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  // Re-fit when the screen turns or changes size.
  useEffect(() => {
    setRect(rectRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.width, screen.height]);
  // Lift the window above the keyboard while typing.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const startRect = useRef(rect);
  const drag = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRect.current = rectRef.current;
          front(id);
        },
        onPanResponderMove: (_, g) => setRect({ ...startRect.current, x: startRect.current.x + g.dx, y: startRect.current.y + g.dy }),
        onPanResponderRelease: save,
        onPanResponderTerminate: save,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );
  const resize = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          startRect.current = rectRef.current;
          front(id);
        },
        onPanResponderMove: (_, g) => setRect({ ...startRect.current, w: startRect.current.w + g.dx, h: startRect.current.h + g.dy }),
        onPanResponderRelease: save,
        onPanResponderTerminate: save,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id],
  );

  if (!open && !keepMounted) return null;
  const height = autoHeight ? undefined : rect.h;
  const shownH = autoHeight ? measured || 420 : rect.h;
  const y = keyboard > 0 ? Math.max(insets.top + 8, Math.min(rect.y, screen.height - keyboard - shownH - 8)) : rect.y;

  return (
    <View
      accessibilityViewIsModal={false}
      onLayout={(e) => autoHeight && setMeasured(Math.round(e.nativeEvent.layout.height))}
      style={{ display: open ? 'flex' : 'none', position: 'absolute', left: rect.x, top: y, width: rect.w, height, zIndex: 100 + z[id], elevation: 20 + z[id], borderRadius: 22, borderWidth: 1, borderColor: border, backgroundColor: background, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 20 } }}
      onTouchStart={() => front(id)}
    >
      {children({ width: rect.w, height: shownH, dragProps: drag.panHandlers })}
      <View {...resize.panHandlers} accessibilityLabel="Resize" hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }} style={{ position: 'absolute', right: 0, bottom: 0, width: 28, height: 28, alignItems: 'flex-end', justifyContent: 'flex-end', padding: 6 }}>
        <Svg width={14} height={14} viewBox="0 0 14 14" fill="none" stroke={border} strokeWidth={1.6} strokeLinecap="round">
          <Path d="M13 5 5 13M13 9l-4 4" />
        </Svg>
      </View>
    </View>
  );
}
