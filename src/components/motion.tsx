import React, { forwardRef, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  TextStyle,
  View,
  ViewProps,
  ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '../theme';

/* ────────────────────────────────────────────────────────────────────────────
 * Motion tokens
 *
 * One vocabulary for the whole app. Curves are the strong custom variants —
 * the stock CSS/RN easings are too weak to read as intentional. Durations stay
 * under 300ms for anything the user triggers directly; exits are always faster
 * than entrances (the user already decided, the system is just catching up).
 * ──────────────────────────────────────────────────────────────────────────── */

export const ease = {
  /** entering / exiting — starts fast, feels instantly responsive */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** moving or morphing on screen — natural accel + decel */
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  /** iOS-like drawer curve (Ionic) */
  drawer: Easing.bezier(0.32, 0.72, 0, 1),
};

export const duration = {
  press: 110, // finger down — must beat the eye
  release: 200, // finger up — settles back
  chip: 200, // selection cross-fade
  enter: 260, // element entrance
  exit: 150, // element exit
  screen: 240, // screen focus
  sheet: 320, // drawer in
  sheetOut: 220, // drawer out
};

export const spring = {
  /** quick, no overshoot — press feedback */
  press: { mass: 0.6, damping: 18, stiffness: 340 },
  /** a hint of bounce — toggles, checkmarks, things that "land" */
  pop: { mass: 0.7, damping: 13, stiffness: 260 },
  /** soft settle — drawers, drag release */
  settle: { mass: 0.9, damping: 22, stiffness: 190 },
};

/**
 * Always animate. Reanimated treats "animation scale = 0" in Android developer
 * options as reduce-motion, which silently killed every animation in release
 * APKs — so motion is opted out of that check at the source.
 */
const NEVER = ReduceMotion.Never;

export const timing = (to: number, ms: number, easing = ease.out, onDone?: () => void) =>
  withTiming(
    to,
    { duration: ms, easing, reduceMotion: NEVER },
    onDone
      ? (finished) => {
          'worklet';
          if (finished) runOnJS(onDone)();
        }
      : undefined
  );

export const springTo = (to: number, config: object = spring.press) =>
  withSpring(to, { ...config, reduceMotion: NEVER });

/* ────────────────────────────────────────────────────────────────────────────
 * Haptics
 *
 * Touch is the other half of feedback. Rule of thumb: buzz when the press
 * *changes something* (claim, toggle, complete, select), stay silent for
 * navigation and scrolling — a haptic on every tap stops meaning anything.
 * ──────────────────────────────────────────────────────────────────────────── */

const fire = (run: () => Promise<unknown>) => {
  if (Platform.OS === 'web') return;
  try {
    run().catch(() => {});
  } catch {
    /* haptics are a nicety, never a failure */
  }
};

export const haptics = {
  /** light tick — a value was picked */
  select: () => fire(() => Haptics.selectionAsync()),
  /** light thud — a normal action fired */
  tap: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** heavier thud — a committing action (claim, join, delete) */
  press: () => fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** something finished */
  success: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** something went wrong */
  error: () => fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof haptics | false;

/* ────────────────────────────────────────────────────────────────────────────
 * Layout-animation presets (real enter *and exit*, plus reflow)
 * ──────────────────────────────────────────────────────────────────────────── */

/** List row entering: rises 12px and fades, staggered by position. */
export const enterRow = (index = 0) =>
  FadeInDown.duration(duration.enter)
    .easing(ease.out)
    .delay(Math.min(index * 35, 140))
    .reduceMotion(NEVER);

/** List row leaving: faster than it arrived. */
export const exitRow = FadeOut.duration(duration.exit).easing(ease.out).reduceMotion(NEVER);

/** Neighbours closing the gap after an insert/remove. */
export const rowLayout = LinearTransition.duration(260).easing(ease.inOut).reduceMotion(NEVER);

/** Plain cross-fade for swapped content. */
export const fadeIn = FadeIn.duration(duration.enter).easing(ease.out).reduceMotion(NEVER);
export const fadeOut = FadeOut.duration(duration.exit).easing(ease.out).reduceMotion(NEVER);

/** Shared value that eases 0↔1 whenever `active` flips — for smooth selection transitions. */
export function useSelectProgress(active: boolean, ms = duration.chip) {
  const p = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    p.value = timing(active ? 1 : 0, ms);
  }, [active, p, ms]);
  return p;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Pressable
 * ──────────────────────────────────────────────────────────────────────────── */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type MotionPressableProps = PressableProps & {
  /** how far it sinks under the finger (0.9–0.98 reads as "pressed", not "shrunk") */
  scaleTo?: number;
  /** haptic fired on press-in; off by default so buzzes stay meaningful */
  haptic?: HapticKind;
};

/**
 * Same layout and touch target as Pressable; only the visual response changes.
 * Press-down is a fast timing (the finger is already there — beat it), release
 * is a spring so it settles instead of stopping dead.
 * (The underlying view is animated, so animated styles may be passed via `style` — cast as any.)
 */
export const MotionPressable = forwardRef<View, MotionPressableProps>(function MotionPressable(
  {
    style,
    children,
    onPressIn,
    onPressOut,
    onHoverIn,
    onHoverOut,
    disabled,
    scaleTo = 0.96,
    haptic = false,
    ...props
  },
  ref
) {
  // Only pay for a re-render when the caller actually reads the press state.
  const needsState = typeof style === 'function' || typeof children === 'function';
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (disabled) {
      if (needsState) setPressed(false);
      scale.value = timing(1, duration.press);
    }
  }, [disabled, scale, needsState]);

  return (
    <AnimatedPressable
      {...props}
      ref={ref}
      disabled={disabled}
      onHoverIn={(event) => {
        if (needsState) setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        if (needsState) setHovered(false);
        onHoverOut?.(event);
      }}
      onPressIn={(event) => {
        if (needsState) setPressed(true);
        scale.value = timing(scaleTo, duration.press);
        if (haptic) haptics[haptic]();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (needsState) setPressed(false);
        scale.value = springTo(1, spring.press);
        onPressOut?.(event);
      }}
      style={[typeof style === 'function' ? style({ pressed, hovered }) : style, animatedStyle]}
    >
      {typeof children === 'function' ? children({ pressed, hovered }) : children}
    </AnimatedPressable>
  );
});

/* ────────────────────────────────────────────────────────────────────────────
 * Entrances
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * Gentle mount entrance (opacity + slight rise) driven by a style transform, so the
 * element stays in normal layout flow. Re-animates only when the element remounts
 * (e.g. a new `key`), not on ordinary re-renders.
 */
export function MotionView({ delay = 0, style, ...props }: ViewProps & { delay?: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(Math.min(delay, 120), timing(1, duration.enter));
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const entrance = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 10 }],
  }));
  return <Animated.View {...props} style={[style, entrance]} />;
}

/**
 * A list row that animates in, *out*, and slides when its neighbours change.
 * Use this instead of MotionView inside lists — MotionView can only animate a
 * mount, so deletes and filter changes pop out with nothing in between.
 */
export function MotionRow({
  index = 0,
  style,
  ...props
}: ViewProps & { index?: number }) {
  return (
    <Animated.View
      {...props}
      style={style}
      entering={enterRow(index)}
      exiting={exitRow}
      layout={rowLayout}
    />
  );
}

/**
 * Fades its children to `dim` whenever the value changes — for rows that go
 * "done" in place. A hard opacity swap reads as a re-render; a fade reads as
 * the same row changing state.
 */
export function DimView({ dim, style, ...props }: ViewProps & { dim: number }) {
  const o = useSharedValue(dim);
  useEffect(() => {
    o.value = timing(dim, duration.chip);
  }, [dim, o]);
  const faded = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View {...props} style={[style, faded]} />;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Controls
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * A pill/chip whose background and text color smoothly cross-fade on selection.
 */
export function AnimatedSegment({
  label,
  active,
  onPress,
  leading,
  style,
  textStyle,
  haptic = 'select',
  activeBg = colors.white,
  inactiveBg = colors.surfaceHi,
  activeFg = colors.black,
  inactiveFg = colors.text,
}: {
  label: string;
  active: boolean;
  onPress?: () => void;
  leading?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  haptic?: HapticKind;
  activeBg?: string;
  inactiveBg?: string;
  activeFg?: string;
  inactiveFg?: string;
}) {
  const p = useSelectProgress(active);
  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [inactiveBg, activeBg]),
  }));
  const fg = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [inactiveFg, activeFg]),
  }));
  return (
    <MotionPressable
      onPress={onPress}
      // only buzz on the press that actually changes the selection
      haptic={active ? false : haptic}
      style={[segStyles.base, style, bg] as any}
    >
      {leading}
      <Animated.Text style={[segStyles.text, textStyle, fg]}>{label}</Animated.Text>
    </MotionPressable>
  );
}

/** Toggle switch with an animated knob and track color. */
export function AnimatedToggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  const p = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    // the knob springs (it's a physical thing sliding), the track just fades
    p.value = springTo(value ? 1 : 0, spring.pop);
  }, [value, p]);
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      Math.max(0, Math.min(1, p.value)),
      [0, 1],
      [colors.surfaceHi, colors.red]
    ),
  }));
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: p.value * 20 }] }));
  return (
    <MotionPressable
      onPress={() => {
        haptics.select();
        onToggle();
      }}
      scaleTo={0.94}
      style={[tglStyles.track, track] as any}
    >
      <Animated.View style={[tglStyles.knob, knob]} />
    </MotionPressable>
  );
}

/**
 * Round checkbox. The fill springs in with a touch of overshoot and the tick
 * scales from 0.4 — never from 0, nothing in the real world appears from nothing.
 */
export function AnimatedCheck({
  checked,
  onPress,
  size = 30,
}: {
  checked: boolean;
  onPress: () => void;
  size?: number;
}) {
  const p = useSharedValue(checked ? 1 : 0);
  useEffect(() => {
    p.value = springTo(checked ? 1 : 0, spring.pop);
  }, [checked, p]);
  const box = useAnimatedStyle(() => {
    const c = Math.max(0, Math.min(1, p.value));
    return {
      backgroundColor: interpolateColor(c, [0, 1], ['rgba(255,0,68,0)', colors.red]),
      borderColor: interpolateColor(c, [0, 1], [colors.stroke, colors.red]),
    };
  });
  const tick = useAnimatedStyle(() => ({
    opacity: Math.max(0, Math.min(1, p.value * 1.6 - 0.2)),
    transform: [{ scale: 0.4 + Math.max(0, p.value) * 0.6 }],
  }));
  return (
    <MotionPressable
      hitSlop={10}
      scaleTo={0.88}
      onPress={() => {
        if (!checked) haptics.success();
        else haptics.select();
        onPress();
      }}
      style={[
        chkStyles.box,
        { width: size, height: size, borderRadius: size / 2 },
        box,
      ] as any}
    >
      <Animated.View style={tick}>
        <Ionicons name="checkmark" size={size * 0.6} color="#fff" />
      </Animated.View>
    </MotionPressable>
  );
}

/**
 * Slow breathing dot. Signals "this is live / unclaimed" without ever asking
 * for attention — 1.6s per cycle, well under a glance.
 */
export function PulseDot({ size = 8, color = colors.red }: { size?: number; color?: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(
      withSequence(timing(1, 800, ease.inOut), timing(0, 800, ease.inOut)),
      -1,
      false
    );
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.45 + p.value * 0.55,
    transform: [{ scale: 0.85 + p.value * 0.25 }],
  }));
  return (
    <Animated.View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

/**
 * Number that eases to `value` — counting up from 0 on first paint, and from
 * whatever is on screen on every change after, so "3 → 4" ticks by one instead
 * of replaying the whole climb. A small scale pop marks that it moved.
 */
export function AnimatedCount({
  value,
  style,
  duration: ms = 620,
}: {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const from = useRef(0);
  const raf = useRef<number | null>(null);
  const mounted = useRef(false);
  const pop = useSharedValue(1);

  useEffect(() => {
    const start = from.current;
    const firstPaint = !mounted.current;
    mounted.current = true;
    if (start === value) return;
    // a one-step change shouldn't take as long as a climb from zero
    const span = Math.min(ms, 220 + Math.abs(value - start) * 45);
    const t0 = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - t0) / span);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = Math.round(start + (value - start) * eased);
      setDisplay(v);
      from.current = t < 1 ? v : value;
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    // The count-up is the entrance; the pop is reserved for later changes.
    if (!firstPaint) pop.value = withSequence(timing(1.12, 120), springTo(1, spring.pop));
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, ms, pop]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <Animated.Text style={[style, popStyle]}>
      {display}
    </Animated.Text>
  );
}

/**
 * Nudges left-right once whenever `trigger` changes to a truthy value.
 * Errors are rare, so they get to be expressive.
 */
export function Shake({ trigger, children, style }: { trigger: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const x = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!trigger) return;
    x.value = withSequence(
      timing(-6, 60),
      timing(6, 70),
      timing(-3, 60),
      springTo(0, spring.pop)
    );
  }, [trigger, x]);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={[style, shake]}>{children}</Animated.View>;
}

const segStyles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  text: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
});

const tglStyles = StyleSheet.create({
  track: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
});

const chkStyles = StyleSheet.create({
  box: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
