import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Avatar, Button, IconButton, Pill, T, Tag } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
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

      {list.length === 0 ? (
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
          <Ionicons name="checkbox-outline" size={34} color={colors.textFaint} />
          <T variant="small" style={{ marginTop: 10 }}>
            Нет тасок в этом фильтре
          </T>
        </View>
      ) : (
        list.map((t) => {
          const assignee = t.assigneeId ? memberById(t.assigneeId) : undefined;
          const mine = t.assigneeId === me.id;
          const done = t.status === 'done';
          return (
            <Pressable key={t.id} onPress={() => setDetail(t)}>
              <View style={[styles.card, done ? { opacity: 0.55 } : null]}>
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
                      <View style={styles.pulse} />
                      <T variant="small" color={colors.red} style={{ fontWeight: '700' }}>
                        Свободна
                      </T>
                    </View>
                  )}

                  {t.status === 'open' ? (
                    <Pressable style={styles.claimBtn} onPress={() => claimTask(t.id)}>
                      <T variant="small" color="#fff" style={{ fontWeight: '800' }}>
                        Беру на себя
                      </T>
                    </Pressable>
                  ) : t.status === 'claimed' && mine ? (
                    <Pressable style={[styles.claimBtn, { backgroundColor: colors.surfaceHi }]} onPress={() => completeTask(t.id)}>
                      <T variant="small" color="#fff" style={{ fontWeight: '800' }}>
                        Готово ✓
                      </T>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </Pressable>
          );
        })
      )}

      {/* Add sheet */}
      <TaskFormSheet
        key={form === 'new' ? 'new' : form?.id}
        target={form}
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
  onClose,
  onSubmit,
}: {
  target: Task | 'new' | null;
  onClose: () => void;
  onSubmit: (p: { title: string; description: string; date?: string }, id?: string) => void;
}) {
  const existing = target && target !== 'new' ? target : null;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [desc, setDesc] = useState(existing?.description ?? '');
  const [date, setDate] = useState<string | undefined>(existing?.date);
  const [withDate, setWithDate] = useState(Boolean(existing?.date));

  return (
    <Sheet visible={target !== null} onClose={onClose} title={existing ? 'Таска' : 'Новая таска'}>
      <Field label="Название" value={title} onChangeText={setTitle} placeholder="Что нужно сделать" autoFocus={!existing} />
      <Field label="Описание" value={desc} onChangeText={setDesc} placeholder="Детали, ссылки, контекст" multiline />
      <View style={{ marginBottom: space.lg }}>
        <Pressable style={styles.toggleRow} onPress={() => setWithDate((v) => !v)}>
          <T variant="body" style={{ fontWeight: '700' }}>Есть дедлайн</T>
          <View style={[styles.switch, withDate ? { backgroundColor: colors.red } : null]}>
            <View style={[styles.knob, withDate ? { alignSelf: 'flex-end' } : null]} />
          </View>
        </Pressable>
      </View>
      {withDate ? <DateField label="Дедлайн" value={date} onChange={setDate} /> : null}
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
  if (!task) return <Sheet visible={false} onClose={onClose} title="" >{null}</Sheet>;
  const mine = task.assigneeId === meId;
  return (
    <Sheet visible={!!task} onClose={onClose} title="Таска">
      <T variant="h1">{task.title}</T>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        {task.date ? <Tag label={`Дедлайн ${fmtShort(task.date)}`} color={colors.red} /> : null}
        <Tag label={`Автор: ${authorName ?? '—'}`} color={colors.textDim} />
        {task.status === 'claimed' && assigneeName ? <Tag label={`Делает ${assigneeName}`} color={colors.textDim} /> : null}
        {task.status === 'done' ? <Tag label="Выполнена" color={colors.textFaint} /> : null}
      </View>
      {task.description ? (
        <>
          <T variant="label" style={{ marginBottom: 6 }}>Описание</T>
          <T variant="body" color={colors.textDim} style={{ marginBottom: space.xl }}>{task.description}</T>
        </>
      ) : null}

      {task.status === 'open' ? (
        <Button title="Беру на себя" tone="red" onPress={onClaim} />
      ) : task.status === 'claimed' && mine ? (
        <>
          <Button title="Отметить готовой" tone="red" onPress={onComplete} />
          <Button title="Отказаться" tone="ghost" style={{ marginTop: 10 }} onPress={onRelease} />
        </>
      ) : task.status === 'claimed' ? (
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
  pulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red },
  claimBtn: { backgroundColor: colors.red, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  switch: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.surfaceHi, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
});
