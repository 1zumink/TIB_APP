import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AvatarStack, Button, IconButton, T } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { ChipSelect, Field } from '@/components/form';
import { useStore } from '@/store/StoreContext';
import { colors, radius, space } from '@/theme';
import { WEEKDAYS_RU, WEEKDAYS_RU_FULL } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import { WorkHour } from '@/types';

const WD_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun

export default function Schedule() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, me, memberById, addWorkHour, updateWorkHour, toggleAttend, removeWorkHour } = useStore();
  const [form, setForm] = useState<WorkHour | 'new' | null>(null);

  const byDay = useMemo(() => {
    const map: Record<number, typeof data.workHours> = {};
    for (const w of data.workHours) (map[w.weekday] ??= []).push(w);
    for (const k of Object.keys(map)) map[+k].sort((a, b) => a.start.localeCompare(b.start));
    return map;
  }, [data.workHours]);

  const todayWeekday = new Date().getDay();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="chevron-back" tone="surface" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <T variant="h2">Общие часы</T>
        <IconButton icon="add" tone="red" onPress={() => setForm('new')} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.xl, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <T variant="body" color={colors.textDim} style={{ marginBottom: space.xl }}>
          Слоты, когда работаем вместе. Отметься — команда увидит, кто в деле.
        </T>

        {WD_ORDER.map((wd) => {
          const slots = byDay[wd] || [];
          if (!slots.length) return null;
          const isToday = wd === todayWeekday;
          return (
            <View key={wd} style={{ marginBottom: space.xl }}>
              <View style={styles.dayHeader}>
                <T variant="h2" color={isToday ? colors.red : colors.text}>
                  {WEEKDAYS_RU_FULL[wd]}
                </T>
                {isToday ? (
                  <View style={styles.todayBadge}>
                    <T variant="small" color="#fff" style={{ fontWeight: '800' }}>
                      сегодня
                    </T>
                  </View>
                ) : null}
              </View>

              {slots.map((w) => {
                const attendees = w.attendees.map((id) => memberById(id)!).filter(Boolean);
                const iAttend = w.attendees.includes(me.id);
                return (
                  <View key={w.id} style={styles.slot}>
                    <View style={styles.timeCol}>
                      <T variant="title" color={colors.red}>{w.start}</T>
                      <View style={styles.timeLine} />
                      <T variant="small">{w.end}</T>
                    </View>
                    <View style={{ flex: 1, marginLeft: space.lg }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <T variant="title" style={{ flex: 1 }}>{w.title}</T>
                        <Pressable hitSlop={8} onPress={() => setForm(w)}>
                          <Ionicons name="create-outline" size={18} color={colors.textFaint} />
                        </Pressable>
                      </View>
                      <View style={styles.slotBottom}>
                        <AvatarStack members={attendees} size={26} />
                        <Pressable
                          onPress={() => toggleAttend(w.id)}
                          style={[styles.attendBtn, iAttend ? { backgroundColor: colors.red } : { backgroundColor: colors.surfaceHi }]}
                        >
                          <T variant="small" color="#fff" style={{ fontWeight: '800' }}>
                            {iAttend ? 'Я в деле ✓' : 'Отметиться'}
                          </T>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}

        {data.workHours.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Ionicons name="calendar-outline" size={34} color={colors.textFaint} />
            <T variant="small" style={{ marginTop: 10 }}>Добавь первый общий слот →</T>
          </View>
        ) : null}
      </ScrollView>

      <WorkHourFormSheet
        key={form === 'new' ? 'new' : form?.id}
        target={form}
        onClose={() => setForm(null)}
        onSubmit={(p, id) => {
          if (id) updateWorkHour(id, p);
          else addWorkHour(p);
          setForm(null);
        }}
        onDelete={(id) => confirm('Удалить слот?', '', () => { removeWorkHour(id); setForm(null); })}
      />
    </View>
  );
}

function WorkHourFormSheet({
  target,
  onClose,
  onSubmit,
  onDelete,
}: {
  target: WorkHour | 'new' | null;
  onClose: () => void;
  onSubmit: (p: { title: string; weekday: number; start: string; end: string }, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const existing = target && target !== 'new' ? target : null;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [weekday, setWeekday] = useState<string>(existing ? WEEKDAYS_RU[existing.weekday] : 'Пн');
  const [start, setStart] = useState(existing?.start ?? '18:00');
  const [end, setEnd] = useState(existing?.end ?? '21:00');

  const timeOk = (t: string) => /^\d{1,2}:\d{2}$/.test(t.trim());
  const valid = title.trim() && timeOk(start) && timeOk(end);

  return (
    <Sheet visible={target !== null} onClose={onClose} title={existing ? 'Co-work' : 'Новый co-work'}>
      <Field label="Название" value={title} onChangeText={setTitle} placeholder="Напр. Общий co-work" autoFocus={!existing} />
      <ChipSelect label="День недели" options={WEEKDAYS_RU} value={weekday as any} onChange={(v) => setWeekday(v)} />
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Field label="Начало" value={start} onChangeText={setStart} placeholder="18:00" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Конец" value={end} onChangeText={setEnd} placeholder="21:00" />
        </View>
      </View>
      <Button
        title={existing ? 'Сохранить' : 'Добавить слот'}
        tone="red"
        disabled={!valid}
        onPress={() =>
          onSubmit(
            { title: title.trim(), weekday: WEEKDAYS_RU.indexOf(weekday), start: start.trim(), end: end.trim() },
            existing?.id
          )
        }
      />
      {existing ? (
        <Button title="Удалить" tone="ghost" icon="trash-outline" style={{ marginTop: 10 }} onPress={() => onDelete(existing.id)} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingBottom: space.md,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: space.md },
  todayBadge: { backgroundColor: colors.red, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  slot: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  timeCol: { alignItems: 'center', width: 52 },
  timeLine: { width: 2, height: 18, backgroundColor: colors.stroke, marginVertical: 4 },
  slotBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  attendBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill },
});
