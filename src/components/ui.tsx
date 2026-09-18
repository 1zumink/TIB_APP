import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  const bg =
    tone === 'red'
      ? colors.red
      : active
      ? colors.white
      : tone === 'outline'
      ? 'transparent'
      : colors.surfaceHi;
  const fg = tone === 'red' ? colors.white : active ? colors.black : colors.text;
  const border = tone === 'outline' && !active ? colors.stroke : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        { backgroundColor: bg, borderColor: border, borderWidth: border === 'transparent' ? 0 : 1 },
        pressed && onPress ? { opacity: 0.7 } : null,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={fg} style={{ marginRight: 6 }} /> : null}
      <Text style={[styles.pillText, { color: fg }]}>{label}</Text>
    </Pressable>
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
}: {
  title: string;
  onPress?: () => void;
  tone?: 'primary' | 'red' | 'ghost' | 'light';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const map = {
    primary: { bg: colors.white, fg: colors.black },
    red: { bg: colors.red, fg: colors.white },
    light: { bg: colors.surfaceHi, fg: colors.text },
    ghost: { bg: 'transparent', fg: colors.text },
  } as const;
  const c = map[tone];
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: c.bg, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        tone === 'ghost' ? { borderWidth: 1, borderColor: colors.stroke } : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={c.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={c.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[styles.buttonText, { color: c.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  tone = 'surface',
  size = 44,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  tone?: 'surface' | 'red' | 'white' | 'ghost';
  size?: number;
  color?: string;
}) {
  const bg =
    tone === 'red' ? colors.red : tone === 'white' ? colors.white : tone === 'ghost' ? 'transparent' : colors.surfaceHi;
  const fg = color || (tone === 'white' ? colors.black : colors.text);
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        },
        tone === 'ghost' ? { borderWidth: 1, borderColor: colors.stroke } : null,
      ]}
    >
      <Ionicons name={icon} size={size * 0.44} color={fg} />
    </Pressable>
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
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={{ color: colors.red, fontWeight: '700', fontSize: 14 }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------- Empty state ---------- */
export function Empty({ icon = 'sparkles-outline', text }: { icon?: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={30} color={colors.textFaint} />
      <T variant="small" style={{ marginTop: 10, textAlign: 'center', maxWidth: 240 }}>
        {text}
      </T>
    </View>
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
  buttonText: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
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
