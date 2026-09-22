import {
  AnimatedSegment,
  HapticKind,
  MotionPressable as Pressable,
  MotionView,
  duration,
  timing,
} from './motion';
import React, { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, space, type } from '../theme';
import { Member } from '../types';

/* ---------- Text ---------- */
type TVariant = keyof typeof type;
export function T({
  variant = 'body',
  color,
  style,
  children,
  ...rest
}: TextProps & { variant?: TVariant; color?: string }) {
  return (
    <Text {...rest} style={[type[variant], color ? { color } : null, style]}>
      {children}
    </Text>
  );
}

/* ---------- Card ---------- */
export function Card({
  children,
  style,
  tone = 'surface',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'paper' | 'red' | 'ghost';
}) {
  const toneStyle: ViewStyle =
    tone === 'paper'
      ? { backgroundColor: colors.paper }
      : tone === 'red'
      ? { backgroundColor: colors.red }
      : tone === 'ghost'
      ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.stroke }
      : { backgroundColor: colors.surface };
  return <View style={[styles.card, toneStyle, style]}>{children}</View>;
}

/* ---------- Pill / Chip ---------- */
export function Pill({
  label,
  active,
  onPress,
  icon,
  tone = 'default',
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'default' | 'red' | 'outline';
}) {
  if (tone === 'red') {
    return (
      <Pressable onPress={onPress} haptic="tap" style={[styles.pill, { backgroundColor: colors.red }]}>
        {icon ? <Ionicons name={icon} size={14} color={colors.white} style={{ marginRight: 6 }} /> : null}
        <Text style={[styles.pillText, { color: colors.white }]}>{label}</Text>
      </Pressable>
    );
  }
  // default / outline: background + text smoothly cross-fade on selection
  return (
    <AnimatedSegment
      label={label}
      active={!!active}
      onPress={onPress}
      activeBg={colors.white}
      inactiveBg={tone === 'outline' ? 'transparent' : colors.surfaceHi}
      activeFg={colors.black}
      inactiveFg={colors.text}
      leading={
        icon ? (
          <Ionicons name={icon} size={14} color={active ? colors.black : colors.text} style={{ marginRight: 6 }} />
        ) : undefined
      }
    />
  );
}

/* ---------- Buttons ---------- */
export function Button({
  title,
  onPress,
  tone = 'primary',
  icon,
  loading,
  disabled,
  style,
  haptic = 'tap',
}: {
  title: string;
  onPress?: () => void;
  tone?: 'primary' | 'red' | 'ghost' | 'light';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  haptic?: HapticKind;
}) {
  const map = {
    primary: { bg: colors.white, fg: colors.black },
    red: { bg: colors.red, fg: colors.white },
    light: { bg: colors.surfaceHi, fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.text },
  } as const;
  const c = map[tone];
  const off = disabled || loading;

  // Disabling fades rather than cuts — the button stays the same object.
  const dim = useSharedValue(disabled ? 0.4 : 1);
  useEffect(() => {
    dim.value = timing(disabled ? 0.4 : 1, duration.chip);
  }, [disabled, dim]);
  const dimStyle = useAnimatedStyle(() => ({ opacity: dim.value }));

  // Label and spinner swap in place, so the button never changes size mid-action.
  const busy = useSharedValue(loading ? 1 : 0);
  useEffect(() => {
    busy.value = timing(loading ? 1 : 0, duration.chip);
  }, [loading, busy]);
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 1 - busy.value,
    transform: [{ scale: 1 - busy.value * 0.06 }],
  }));
  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: busy.value,
    transform: [{ scale: 0.9 + busy.value * 0.1 }],
  }));

  return (
    <Pressable
      disabled={off}
      haptic={off ? false : haptic}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: c.bg },
        tone === 'ghost' ? { borderWidth: 1, borderColor: colors.stroke } : null,
        style,
        dimStyle,
      ] as any}
    >
      <Animated.View style={[styles.buttonRow, labelStyle]}>
        {icon ? <Ionicons name={icon} size={18} color={c.fg} style={{ marginRight: 8 }} /> : null}
        <Text style={[styles.buttonText, { color: c.fg }]}>{title}</Text>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.buttonRow, spinnerStyle]} pointerEvents="none">
        <ActivityIndicator color={c.fg} />
      </Animated.View>
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'surface',
  size = 44,
  color,
  haptic = 'select',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  tone?: 'surface' | 'red' | 'white' | 'ghost';
  size?: number;
  color?: string;
  haptic?: HapticKind;
}) {
  const bg =
    tone === 'red' ? colors.red : tone === 'white' ? colors.white : tone === 'ghost' ? 'transparent' : colors.surfaceHi;
  const fg = color || (tone === 'white' ? colors.black : colors.text);
  return (
    <Pressable
      onPress={onPress}
      haptic={haptic}
      // small round targets need a deeper press to read as one
      scaleTo={0.88}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        tone === 'ghost' ? { borderWidth: 1, borderColor: colors.stroke } : null,
      ]}
    >
      <Ionicons name={icon} size={size * 0.44} color={fg} />
    </Pressable>
  );
}

/**
 * Floating action button, bottom right.
 *
 * Sits above the page rather than in a header, so the reach stays in the
 * thumb's arc and the top of the screen is left to the content.
 */
export function Fab({
  icon = 'add',
  onPress,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.fab, { bottom: insets.bottom + space.xl }]} pointerEvents="box-none">
      {/* The wrapper carries the button's own shape and fill: Android casts
          elevation from the view's background, and a transparent one throws
          no shadow at all. */}
      <View style={[shadow.red, { borderRadius: 29, backgroundColor: colors.red }]}>
        <IconButton icon={icon} tone="red" size={58} haptic="tap" onPress={onPress} />
      </View>
    </View>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({ member, size = 40 }: { member?: Member; size?: number }) {
  const initials = member ? member.name.slice(0, 1).toUpperCase() : '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: member?.color || colors.surfaceHi,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.bg,
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.42 }}>{initials}</Text>
    </View>
  );
}

export function AvatarStack({ members, size = 30, max = 4 }: { members: Member[]; size?: number; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((m, i) => (
        <View key={m.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.34 }}>
          <Avatar member={m} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={{
            marginLeft: -size * 0.34,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.surfaceHi,
            borderWidth: 2,
            borderColor: colors.bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: size * 0.34 }}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

/* ---------- Section header ---------- */
export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <T variant="h2">{title}</T>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={10} haptic="select" scaleTo={0.94}>
          <Text style={{ color: colors.red, fontWeight: '700', fontSize: 14 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------- Empty state ---------- */
export function Empty({ icon = 'sparkles-outline', text }: { icon?: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <MotionView style={styles.empty}>
      <Ionicons name={icon} size={30} color={colors.textFaint} />
      <T variant="small" style={{ marginTop: 10, textAlign: 'center', maxWidth: 240 }}>
        {text}
      </T>
    </MotionView>
  );
}

/* ---------- Tag ---------- */
export function Tag({ label, color = colors.textDim }: { label: string; color?: string }) {
  return (
    <View style={[styles.tag, { borderColor: color }]}>
      <Text style={{ color, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: space.lg,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2 },
  button: {
    height: 56,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  fab: { position: 'absolute', right: space.xl, zIndex: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  tag: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
});
