import {
  AnimatedToggle,
  DimView,
  MotionPressable as Pressable,
  MotionRow,
  PulseDot,
  fadeIn,
  fadeOut,
  haptics,
} from '@/components/motion';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Avatar, Button, IconButton, Pill, T, Tag } from '@/components/ui';
import { Sheet, useLastValue } from '@/components/Sheet';
import { DateField, Field } from '@/components/form';
import { useStore } from '@/store/StoreContext';
import { colors, radius, space } from '@/theme';
import { countdown, fmtShort } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import { Task } from '@/types';

type Filter = 'open' | 'mine' | 'all' | 'done';

export default function Tasks() {
  const { data, me, memberById, addTask, updateTask, claimTask, releaseTask, completeTask, removeTask } = useStore();
  const [filter, setFilter] = useState<Filter>('open');
  const [form, setForm] = useState<Task | 'new' | null>(null);
  const [detail, setDetail] = useState<Task | null>(null);
  // The sheet keeps rendering the form it was opened with while it slides away.
  const shownForm = useLastValue(form);

  const list = useMemo(() => {
    let arr = [...data.tasks];
    if (filter === 'open') arr = arr.filter((t) => t.status === 'open');
    if (filter === 'done') arr = arr.filter((t) => t.status === 'done');
    if (filter === 'mine') arr = arr.filter((t) => t.assigneeId === me.id);
    return arr.sort((a, b) => b.createdAt - a.createdAt);
  }, [data.tasks, filter, me.id]);

  return (
    <Screen>
      <View style={styles.head}>
        <View>
          <T variant="label">Кто-то один справится</T>
          <T variant="display">Таски</T>
        </View>
        <IconButton icon="add" tone="red" size={52} onPress={() => setForm('new')} />
      </View>

      <View style={styles.filters}>
        <Pill label="Открытые" active={filter === 'open'} onPress={() => setFilter('open')} />
        <Pill label="Мои" active={filter === 'mine'} onPress={() => setFilter('mine')} />
        <Pill label="Все" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Pill label="Готово" active={filter === 'done'} onPress={() => setFilter('done')} />
      </View>

      {/* No wrapper keyed on `filter`: remounting the list would replace every
          row's exit with a cut. Per-row enter/exit/layout lets a filter change
          read as rows leaving and arriving. */}
      {list.length === 0 ? (
        <Animated.View style={{ paddingTop: 60, alignItems: 'center' }} entering={fadeIn} exiting={fadeOut}>
          <Ionicons name="checkbox-outline" size={34} color={colors.textFaint} />
          <T variant="small" style={{ marginTop: 10 }}>
            Нет тасок в этом фильтре
          </T>
        </Animated.View>
      ) : (
        list.map((t, index) => {
          const assignee = t.assigneeId ? memberById(t.assigneeId) : undefined;
          const mine = t.assigneeId === me.id;
          const done = t.status === 'done';
          return (
            <MotionRow key={t.id} index={index}>
              <Pressable onPress={() => setDetail(t)}>
                <DimView dim={done ? 0.55 : 1} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <T variant="title" style={done ? { textDecorationLine: 'line-through' } : null}>
                        {t.title}
                      </T>
                      <T variant="small" numberOfLines={2} style={{ marginTop: 6 }}>
                        {t.description}
                      </T>
                    </View>
                    {t.date ? (
                      <View style={styles.datePill}>
                        <T variant="small" color={colors.red} style={{ fontWeight: '800' }}>
                          {countdown(t.date).text}
                        </T>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardBottom}>
                    {/* Status text and action swap by key, so claiming a task
                        cross-fades in place instead of blinking to new copy. */}
                    <Animated.View key={`s-${t.status}`} entering={fadeIn}>
                      {done ? (
                        <Tag label={`Сделал ${assignee?.name ?? ''}`} color={colors.textFaint} />
                      ) : t.status === 'claimed' && assignee ? (
                        <View style={styles.assigneeRow}>
                          <Avatar member={assignee} size={22} />
                          <T variant="small" style={{ marginLeft: 6 }}>
                            Делает {assignee.name}
                            {mine ? ' (ты)' : ''}
                          </T>
                        </View>
                      ) : (
                        <View style={styles.freeRow}>
                          {/* an unclaimed task is the one thing on this screen
                              asking to be picked up — so it breathes */}
                          <PulseDot size={8} />
                          <T variant="small" color={colors.red} style={{ fontWeight: '700' }}>
                            Свободна
                          </T>
                        </View>
                      )}
                    </Animated.View>

                    <Animated.View key={`a-${t.status}`} entering={fadeIn}>
                      {t.status === 'open' ? (
                        <Pressable
                          style={styles.claimBtn}
                          haptic="press"
                          onPress={() => claimTask(t.id)}
                        >
                          <T variant="small" color="#fff" style={{ fontWeight: '800' }}>
                            Беру на себя
                          </T>
                        </Pressable>
                      ) : t.status === 'claimed' && mine ? (
                        <Pressable
                          style={[styles.claimBtn, { backgroundColor: colors.surfaceHi }]}
                          onPress={() => {
                            haptics.success();
                            completeTask(t.id);
                          }}
                        >
                          <T variant="small" color="#fff" style={{ fontWeight: '800' }}>
                            Готово ✓
                          </T>
                        </Pressable>
                      ) : null}
                    </Animated.View>
                  </View>
                </DimView>
              </Pressable>
            </MotionRow>
          );
        })
      )}

      {/* Add sheet */}
      <TaskFormSheet
        key={shownForm === 'new' ? 'new' : shownForm?.id}
        visible={form !== null}
        target={shownForm}
        onClose={() => setForm(null)}
        onSubmit={(p, id) => {
          if (id) updateTask(id, p);
          else addTask(p);
          setForm(null);
        }}
      />

      {/* Detail sheet */}
      <TaskDetailSheet
        task={detail}
        meId={me.id}
        assigneeName={detail?.assigneeId ? memberById(detail.assigneeId)?.name : undefined}
        authorName={detail ? memberById(detail.createdBy)?.name : undefined}
        onClose={() => setDetail(null)}
        onEdit={() => { const t = detail; setDetail(null); setForm(t); }}
        onClaim={() => { if (detail) { claimTask(detail.id); setDetail(null); } }}
        onRelease={() => { if (detail) { releaseTask(detail.id); setDetail(null); } }}
        onComplete={() => { if (detail) { completeTask(detail.id); setDetail(null); } }}
        onDelete={() => {
          if (!detail) return;
          const id = detail.id;
          confirm('Удалить таску?', '', () => { removeTask(id); setDetail(null); });
        }}
      />
    </Screen>
  );
}

function TaskFormSheet({
  target,
  visible,
  onClose,
  onSubmit,
}: {
  target: Task | 'new' | null;
  visible: boolean;
  onClose: () => void;
  onSubmit: (p: { title: string; description: string; date?: string }, id?: string) => void;
}) {
  const existing = target && target !== 'new' ? target : null;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [desc, setDesc] = useState(existing?.description ?? '');
  const [date, setDate] = useState<string | undefined>(existing?.date);
  const [withDate, setWithDate] = useState(Boolean(existing?.date));

  return (
    <Sheet visible={visible} onClose={onClose} title={existing ? 'Таска' : 'Новая таска'}>
      <Field label="Название" value={title} onChangeText={setTitle} placeholder="Что нужно сделать" autoFocus={!existing} />
      <Field label="Описание" value={desc} onChangeText={setDesc} placeholder="Детали, ссылки, контекст" multiline />
      <View style={[styles.toggleRow, { marginBottom: space.lg }]}>
        <T variant="body" style={{ fontWeight: '700' }}>Есть дедлайн</T>
        <AnimatedToggle value={withDate} onToggle={() => setWithDate((v) => !v)} />
      </View>
      {withDate ? (
        <Animated.View entering={fadeIn} exiting={fadeOut}>
          <DateField label="Дедлайн" value={date} onChange={setDate} />
        </Animated.View>
      ) : null}
      <Button
        title={existing ? 'Сохранить' : 'Добавить таску'}
        tone="red"
        disabled={!title.trim()}
        onPress={() =>
          onSubmit(
            { title: title.trim(), description: desc.trim(), date: withDate ? date : undefined },
            existing?.id
          )
        }
      />
    </Sheet>
  );
}

function TaskDetailSheet({
  task, meId, assigneeName, authorName, onClose, onEdit, onClaim, onRelease, onComplete, onDelete,
}: {
  task: Task | null;
  meId: string;
  assigneeName?: string;
  authorName?: string;
  onClose: () => void;
  onEdit: () => void;
  onClaim: () => void;
  onRelease: () => void;
  onComplete: () => void;
  onDelete: () => void;
}) {
  // Keep the last task around through the closing animation — dropping it the
  // instant it's cleared would empty the sheet while it's still on screen.
  const shown = useLastValue(task);
  if (!shown) return <Sheet visible={false} onClose={onClose} title="Таска">{null}</Sheet>;
  const mine = shown.assigneeId === meId;
  return (
    <Sheet visible={!!task} onClose={onClose} title="Таска">
      <T variant="h1">{shown.title}</T>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {shown.date ? <Tag label={`Дедлайн ${fmtShort(shown.date)}`} color={colors.red} /> : null}
        <Tag label={`Автор: ${authorName ?? '—'}`} color={colors.textDim} />
        {shown.status === 'claimed' && assigneeName ? <Tag label={`Делает ${assigneeName}`} color={colors.textDim} /> : null}
        {shown.status === 'done' ? <Tag label="Выполнена" color={colors.textFaint} /> : null}
      </View>
      {shown.description ? (
        <>
          <T variant="label" style={{ marginBottom: 6 }}>Описание</T>
          <T variant="body" color={colors.textDim} style={{ marginBottom: space.xl }}>{shown.description}</T>
        </>
      ) : null}

      {shown.status === 'open' ? (
        <Button title="Беру на себя" tone="red" onPress={onClaim} />
      ) : shown.status === 'claimed' && mine ? (
        <>
          <Button title="Отметить готовой" tone="red" onPress={onComplete} />
          <Button title="Отказаться" tone="ghost" style={{ marginTop: 10 }} onPress={onRelease} />
        </>
      ) : shown.status === 'claimed' ? (
        <Button title={`Делает ${assigneeName}`} tone="light" disabled />
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
        <Button title="Редактировать" tone="light" icon="create-outline" style={{ flex: 1 }} onPress={onEdit} />
        <Button title="Удалить" tone="ghost" icon="trash-outline" style={{ flex: 1 }} onPress={onDelete} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.md },
  filters: { flexDirection: 'row', gap: 8, marginBottom: space.md, flexWrap: 'wrap' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.md, marginBottom: space.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  datePill: { backgroundColor: colors.redSoft, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  assigneeRow: { flexDirection: 'row', alignItems: 'center' },
  freeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  claimBtn: { backgroundColor: colors.red, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
