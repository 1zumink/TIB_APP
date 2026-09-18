import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from '../theme';
import { Avatar, T } from './ui';
import { Member } from '../types';
import { WEEKDAYS_RU, fmtLong, parseISO, toISO, todayISO } from '../lib/date';

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
          {members.map((m) => {
            const active = m.id === value;
            return (
              <Pressable
                key={m.id}
                onPress={() => onChange(m.id)}
                style={[
                  styles.memberChip,
                  active ? { backgroundColor: colors.white, borderColor: colors.white } : null,
                ]}
              >
                <Avatar member={m} size={24} />
                <T
                  variant="body"
                  color={active ? colors.black : colors.text}
                  style={{ fontWeight: '700', marginLeft: 8 }}
                >
                  {m.name}
                </T>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

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
  return (
    <View style={{ marginBottom: space.lg }}>
      <T variant="label" style={{ marginBottom: 8 }}>
        {label}
      </T>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        autoFocus={autoFocus}
        style={[styles.input, multiline ? { height: 96, textAlignVertical: 'top' } : null]}
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

  return (
    <View style={{ marginBottom: space.lg }}>
      <T variant="label" style={{ marginBottom: 8 }}>
        {label}
      </T>
      <View style={styles.calCard}>
        <View style={styles.calHead}>
          <Pressable hitSlop={10} onPress={() => setCursor(new Date(year, month - 1, 1))}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <T variant="title" style={{ textTransform: 'capitalize' }}>
            {monthName}
          </T>
          <Pressable hitSlop={10} onPress={() => setCursor(new Date(year, month + 1, 1))}>
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
        <View style={styles.grid}>
          {cells.map((d, i) => {
            if (d === null) return <View key={i} style={styles.dayCell} />;
            const iso = toISO(new Date(year, month, d));
            const selected = iso === value;
            const isToday = iso === today;
            return (
              <Pressable key={i} style={styles.dayCell} onPress={() => onChange(iso)}>
                <View
                  style={[
                    styles.dayInner,
                    selected ? { backgroundColor: colors.red } : null,
                    !selected && isToday ? { borderWidth: 1, borderColor: colors.stroke } : null,
                  ]}
                >
                  <T
                    variant="body"
                    color={selected ? '#fff' : isToday ? colors.red : colors.text}
                    style={{ fontWeight: selected ? '800' : '600' }}
                  >
                    {d}
                  </T>
                </View>
              </Pressable>
            );
          })}
        </View>
        {value ? (
          <T variant="small" style={{ marginTop: 6 }}>
            Выбрано: {fmtLong(value)}
          </T>
        ) : null}
      </View>
    </View>
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
          {options.map((o) => {
            const active = o === value;
            return (
              <Pressable
                key={o}
                onPress={() => onChange(o)}
                style={[styles.chip, active ? { backgroundColor: colors.white } : null]}
              >
                <T variant="body" color={active ? colors.black : colors.text} style={{ fontWeight: '700' }}>
                  {o}
                </T>
              </Pressable>
            );
          })}
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
