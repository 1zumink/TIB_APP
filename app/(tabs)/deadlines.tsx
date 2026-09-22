import {
  AnimatedCheck,
  DimView,
  MotionPressable as Pressable,
  MotionRow,
  fadeIn,
  fadeOut,
} from '@/components/motion';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Avatar, Button, IconButton, Pill, T, Tag } from '@/components/ui';
import { Sheet, useLastValue } from '@/components/Sheet';
import { DateField, Field, MemberSelect } from '@/components/form';
import { useStore } from '@/store/StoreContext';
import { colors, radius, space } from '@/theme';
import { countdown, daysLeft, fmtShort, todayISO } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import { Deadline } from '@/types';

type Filter = 'all' | 'active' | 'mine' | 'done';

export default function Deadlines() {
  const { data, me, memberById, addDeadline, updateDeadline, toggleDeadlineDone, removeDeadline } = useStore();
  const [filter, setFilter] = useState<Filter>('active');
  const [editing, setEditing] = useState<Deadline | 'new' | null>(null);
  const shownEditing = useLastValue(editing);

  const list = useMemo(() => {
    let arr = [...data.deadlines];
    if (filter === 'active') arr = arr.filter((d) => d.status === 'active');
    if (filter === 'done') arr = arr.filter((d) => d.status === 'done');
    if (filter === 'mine') arr = arr.filter((d) => d.ownerId === me.id);
    return arr.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
      return daysLeft(a.date) - daysLeft(b.date);
    });
  }, [data.deadlines, filter, me.id]);

  return (
    <Screen>
      <View style={styles.head}>
        <View>
          <T variant="label">Общая таблица</T>
          <T variant="display">Дедлайны</T>
        </View>
        <IconButton icon="add" tone="red" size={52} onPress={() => setEditing('new')} />
      </View>

      <View style={styles.filters}>
        <Pill label="Активные" active={filter === 'active'} onPress={() => setFilter('active')} />
        <Pill label="Все" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Pill label="Мои" active={filter === 'mine'} onPress={() => setFilter('mine')} />
        <Pill label="Готово" active={filter === 'done'} onPress={() => setFilter('done')} />
      </View>

      {/* Rows own their enter/exit/layout, so ticking one done or switching
          filters re-sorts the list in front of you instead of cutting to it. */}
      {list.length === 0 ? (
        <Animated.View style={{ paddingTop: 60, alignItems: 'center' }} entering={fadeIn} exiting={fadeOut}>
          <Ionicons name="flame-outline" size={34} color={colors.textFaint} />
          <T variant="small" style={{ marginTop: 10 }}>
            Тут пусто. Добавь первый дедлайн →
          </T>
        </Animated.View>
      ) : (
        list.map((d, index) => {
          const cd = countdown(d.date);
          const done = d.status === 'done';
          const owner = memberById(d.ownerId);
          return (
            <MotionRow key={d.id} index={index}>
              <Pressable onPress={() => setEditing(d)}>
                <DimView dim={done ? 0.5 : 1} style={styles.card}>
                  <AnimatedCheck checked={done} onPress={() => toggleDeadlineDone(d.id)} />
                  <View style={{ flex: 1, marginLeft: space.md }}>
                    <T variant="title" style={done ? { textDecorationLine: 'line-through' } : null}>
                      {d.title}
                    </T>
                    <View style={styles.metaRow}>
                      <Tag label={d.project} color={colors.textDim} />
                      <View style={styles.owner}>
                        <Avatar member={owner} size={18} />
                        <T variant="small" style={{ marginLeft: 5 }}>
                          {owner?.name}
                        </T>
                      </View>
                    </View>
                  </View>
                  {!done ? (
                    <Animated.View
                      key="cd"
                      entering={fadeIn}
                      style={[
                        styles.cd,
                        cd.overdue
                          ? { backgroundColor: colors.red }
                          : cd.urgent
                          ? { backgroundColor: colors.redSoft }
                          : { backgroundColor: colors.surfaceHi },
                      ]}
                    >
                      <T
                        variant="small"
                        color={cd.overdue ? '#fff' : cd.urgent ? colors.red : colors.text}
                        style={{ fontWeight: '800' }}
                      >
                        {cd.text}
                      </T>
                      <T variant="small" color={cd.overdue ? 'rgba(255,255,255,0.8)' : colors.textDim} style={{ fontSize: 11 }}>
                        {fmtShort(d.date)}
                      </T>
                    </Animated.View>
                  ) : (
                    <Animated.View key="done" entering={fadeIn}>
                      <Tag label="Готово" color={colors.textFaint} />
                    </Animated.View>
                  )}
                </DimView>
              </Pressable>
            </MotionRow>
          );
        })
      )}

      <DeadlineSheet
        key={shownEditing === 'new' ? 'new' : shownEditing?.id}
        visible={editing !== null}
        editing={shownEditing}
        onClose={() => setEditing(null)}
        members={data.members}
        defaultOwner={me.id}
        onSave={(payload, id) => {
          if (id) updateDeadline(id, payload);
          else addDeadline(payload);
          setEditing(null);
        }}
        onDelete={(id) => confirm('Удалить дедлайн?', '', () => { removeDeadline(id); setEditing(null); })}
      />
    </Screen>
  );
}

function DeadlineSheet({
  editing,
  visible,
  onClose,
  onSave,
  onDelete,
  members,
  defaultOwner,
}: {
  editing: Deadline | 'new' | null;
  visible: boolean;
  onClose: () => void;
  onSave: (payload: Omit<Deadline, 'id' | 'createdAt' | 'status'>, id?: string) => void;
  onDelete: (id: string) => void;
  members: { id: string; name: string; role: string; code: string; color: string }[];
  defaultOwner: string;
}) {
  const existing = editing && editing !== 'new' ? editing : null;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [project, setProject] = useState(existing?.project ?? '');
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [ownerId, setOwnerId] = useState(existing?.ownerId ?? defaultOwner);

  const valid = title.trim().length > 0 && project.trim().length > 0;

  return (
    <Sheet visible={visible} onClose={onClose} title={existing ? 'Дедлайн' : 'Новый дедлайн'}>
      <Field label="Что нужно сделать" value={title} onChangeText={setTitle} placeholder="Напр. Финальный кейс" autoFocus />
      <Field label="Проект" value={project} onChangeText={setProject} placeholder="Напр. Portfolio" />
      <MemberSelect label="Ответственный" members={members as any} value={ownerId} onChange={setOwnerId} />
      <DateField label="Дедлайн" value={date} onChange={setDate} />
      <Button
        title={existing ? 'Сохранить' : 'Добавить дедлайн'}
        tone="red"
        disabled={!valid}
        onPress={() => onSave({ title: title.trim(), project: project.trim(), date, ownerId }, existing?.id)}
      />
      {existing ? (
        <Button title="Удалить" tone="ghost" style={{ marginTop: 10 }} onPress={() => onDelete(existing.id)} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.md },
  filters: { flexDirection: 'row', gap: 8, marginBottom: space.md, flexWrap: 'wrap' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.sm,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  owner: { flexDirection: 'row', alignItems: 'center' },
  cd: {
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 66,
    gap: 2,
  },
});
