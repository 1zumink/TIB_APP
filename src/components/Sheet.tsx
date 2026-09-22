import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors, space } from '../theme';
import { duration, ease, haptics, spring, timing } from './motion';
import { IconButton, T } from './ui';

const WINDOW_H = Dimensions.get('window').height;

/**
 * Remembers the last non-null value. Sheets close over ~220ms; without this the
 * content resets to empty the instant you tap close and you watch a blank sheet
 * slide away. Feed the sheet this value and keep `visible` on the live one.
 */
export function useLastValue<T>(value: T | null | undefined): T | null {
  const last = useRef<T | null>(value ?? null);
  if (value !== null && value !== undefined) last.current = value;
  return value ?? last.current;
}

/** Past this share of its own height, or this fast, the sheet is going away. */
const DISMISS_RATIO = 0.3;
const DISMISS_VELOCITY = 700; // px/s — a flick is enough, distance optional

/**
 * Bottom sheet with its own enter/exit motion instead of Modal's `slide`.
 *
 * Three things that need to be ours, not the platform's:
 *  - the backdrop fades with the sheet (a hard cut reads as two separate events)
 *  - the exit is faster than the entrance — the user already decided
 *  - the drag can be released mid-flight and the close continues from there,
 *    rather than snapping back and replaying
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  // Keep the modal mounted through the exit animation, then drop it.
  const [mounted, setMounted] = useState(visible);
  const y = useSharedValue(WINDOW_H);
  const height = useSharedValue(WINDOW_H);
  const opened = useRef(false);
  const measured = useRef(false);

  const unmount = useCallback(() => setMounted(false), []);

  const open = useCallback(
    (h: number) => {
      opened.current = true;
      // A fresh open starts fully off-screen; an open that interrupts a close
      // resumes from wherever the sheet currently sits, so it never jumps back
      // down just to come up again.
      if (y.value > h) y.value = h;
      y.value = timing(0, duration.sheet, ease.drawer);
    },
    [y]
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Re-opening a sheet we've already measured shouldn't wait for layout —
      // that wait is a frame of the sheet sitting visibly off-screen.
      if (measured.current && !opened.current) open(height.value);
      return;
    }
    if (!opened.current) return;
    opened.current = false;
    // Exits run from wherever the sheet currently is — including mid-drag.
    y.value = timing(height.value, duration.sheetOut, ease.out, unmount);
  }, [visible, y, height, unmount]);

  // The sheet's height is only known after layout, so the first entrance starts there.
  const onLayout = (h: number) => {
    height.value = h;
    measured.current = true;
    if (visible && !opened.current) open(h);
  };

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  // Backdrop opacity is tied to position, so dragging dims and undims with the finger.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.max(0, y.value / Math.max(1, height.value))),
  }));

  const dismiss = () => {
    haptics.tap();
    onClose();
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      // Upward drag gets heavy friction instead of a wall — things slow before they stop.
      y.value = event.translationY < 0 ? event.translationY * 0.15 : event.translationY;
    })
    .onEnd((event) => {
      const far = event.translationY > height.value * DISMISS_RATIO;
      const fast = event.translationY > 12 && event.velocityY > DISMISS_VELOCITY;
      if (far || fast) {
        runOnJS(dismiss)();
      } else {
        y.value = withSpring(0, { ...spring.settle, velocity: event.velocityY, reduceMotion: ReduceMotion.Never });
      }
    })
    .onFinalize((_event, success) => {
      if (!success) y.value = withSpring(0, { ...spring.settle, reduceMotion: ReduceMotion.Never });
    });

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.wrap}
          pointerEvents="box-none"
        >
          <Animated.View
            onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
            style={[styles.sheet, { paddingBottom: insets.bottom + space.lg }, sheetStyle]}
          >
            <GestureDetector gesture={pan}>
              <View style={styles.dragArea} collapsable={false}>
                <View style={styles.handle} />
              </View>
            </GestureDetector>
            <View style={styles.header}>
              <T variant="h2">{title}</T>
              <IconButton icon="close" tone="surface" size={38} onPress={onClose} />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: space.sm }}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  wrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: space.xl,
    maxHeight: '88%',
    borderTopWidth: 1,
    borderColor: colors.stroke,
  },
  dragArea: {
    height: 36,
    marginHorizontal: -space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.stroke,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
});
