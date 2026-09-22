import {
  AnimatedSegment,
  MotionPressable as Pressable,
  duration,
  ease,
  haptics,
  spring,
  springTo,
  timing,
} from './motion';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space, type } from '../theme';
import { Avatar, T } from './ui';
import { Member } from '../types';
import { WEEKDAYS_RU, fmtLong, parseISO, toISO, todayISO } from '../lib/date';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);
const clamp01 = (v: number) => {
  'worklet';
  return Math.max(0, Math.min(1, v));
};

export function MemberSelect({
  label,
  members,
  value,
  onChange,
}: {
  label: string;
  members: Member[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <T variant="label" style={{ marginBottom: 8 }}>
        {label}
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {members.map((m) => (
            <AnimatedSegment
              key={m.id}
              label={m.name}
              active={m.id === value}
              onPress={() => onChange(m.id)}
              leading={<Avatar member={m} size={24} />}
              activeBg={colors.white}
              inactiveBg={colors.surface}
              activeFg={colors.black}
              inactiveFg={colors.text}
              textStyle={{ fontSize: 15, fontWeight: '700', marginLeft: 8 }}
              style={styles.memberChip}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Text field whose border warms to red while focused. The state is already
 * communicated by the caret — the border just makes the *active* field obvious
 * in a stack of five identical ones, and fading it avoids the flicker of a
 * hard color swap on every tap.
 */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoFocus,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  const focus = useSharedValue(0);
  const border = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.stroke, colors.red]),
    backgroundColor: interpolateColor(focus.value, [0, 1], [colors.surface, colors.bgElevated]),
  }));
  return (
    <View style={{ marginBottom: space.lg }}>
      <T variant="label" style={{ marginBottom: 8 }}>
        {label}
      </T>
      <AnimatedInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        autoFocus={autoFocus}
        onFocus={() => {
          focus.value = timing(1, duration.chip);
        }}
        onBlur={() => {
          focus.value = timing(0, duration.chip);
        }}
        style={[styles.input, multiline ? { height: 96, textAlignVertical: 'top' } : null, border]}
      />
    </View>
  );
}

/** Simple month calendar picker (no native deps). */
export function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (iso: string) => void;
}) {
  const [cursor, setCursor] = useState(() => parseISO(value || todayISO()));
  // Which way the month moved, so the grid enters from the side it came from.
  const [dir, setDir] = useState(1);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthName = first.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  const today = todayISO();

  const step = (delta: number) => {
    haptics.select();
    setDir(delta);
    setCursor(new Date(year, month + delta, 1));
  };

  return (
    <View style={{ marginBottom: space.lg }}>
      <T variant="label" style={{ marginBottom: 8 }}>
        {label}
      </T>
      <View style={styles.calCard}>
        <View style={styles.calHead}>
          <Pressable hitSlop={10} scaleTo={0.86} onPress={() => step(-1)}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <T variant="title" style={{ textTransform: 'capitalize' }}>
            {monthName}
          </T>
          <Pressable hitSlop={10} scaleTo={0.86} onPress={() => step(1)}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.weekRow}>
          {WEEKDAYS_RU.map((w) => (
            <T key={w} variant="small" style={styles.weekCell}>
              {w}
            </T>
          ))}
        </View>
        <MonthGrid key={`${year}-${month}`} dir={dir}>
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.dayCell} />;
            const iso = toISO(new Date(year, month, d));
            return (
              <DayButton
                key={i}
                day={d}
                selected={iso === value}
                isToday={iso === today}
                onPress={() => {
                  haptics.select();
                  onChange(iso);
                }}
              />
            );
          })}
        </MonthGrid>
        {value ? (
          <T variant="small" style={{ marginTop: 6 }}>
            Выбрано: {fmtLong(value)}
          </T>
        ) : null}
      </View>
    </View>
  );
}

/** The month grid slides in from the direction it was paged from. */
function MonthGrid({ dir, children }: { dir: number; children: React.ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = timing(1, duration.enter, ease.out);
  }, [p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ translateX: (1 - p.value) * 22 * dir }],
  }));
  return <Animated.View style={[styles.grid, style]}>{children}</Animated.View>;
}

/**
 * A day. The selected disc springs up from 0.6 rather than appearing whole,
 * and the numeral cross-fades to white in step with it.
 */
function DayButton({
  day,
  selected,
  isToday,
  onPress,
}: {
  day: number;
  selected: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  const p = useSharedValue(selected ? 1 : 0);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      p.value = selected ? 1 : 0;
      return;
    }
    p.value = selected ? springTo(1, spring.pop) : timing(0, duration.exit);
  }, [selected, p]);

  const disc = useAnimatedStyle(() => ({
    opacity: clamp01(p.value),
    transform: [{ scale: 0.6 + clamp01(p.value) * 0.4 }],
  }));
  const rest = isToday ? colors.red : colors.text;
  const label = useAnimatedStyle(() => ({
    color: interpolateColor(clamp01(p.value), [0, 1], [rest, '#fff']),
  }));

  return (
    <Pressable style={styles.dayCell} scaleTo={0.9} onPress={onPress}>
      <View style={[styles.dayInner, !selected && isToday ? styles.dayToday : null]}>
        <Animated.View style={[styles.dayDisc, disc]} />
        <Animated.Text style={[type.body, { fontWeight: selected ? '800' : '600' }, label]}>
          {day}
        </Animated.Text>
      </View>
    </Pressable>
  );
}

/** Horizontal chip selector */
export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <T variant="label" style={{ marginBottom: 8 }}>
        {label}
      </T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {options.map((o) => (
            <AnimatedSegment
              key={o}
              label={o}
              active={o === value}
              onPress={() => onChange(o)}
              activeBg={colors.white}
              inactiveBg={colors.surfaceHi}
              activeFg={colors.black}
              inactiveFg={colors.text}
              textStyle={{ fontSize: 15, fontWeight: '700' }}
              style={styles.chip}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  calCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  calHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekCell: { width: `${100 / 7}%`, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: { borderWidth: 1, borderColor: colors.stroke },
  dayDisc: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 18,
    backgroundColor: colors.red,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceHi,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingRight: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
});
