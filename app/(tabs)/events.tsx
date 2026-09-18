import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { AvatarStack, Button, IconButton, T, Tag } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { ChipSelect, DateField, Field } from '@/components/form';
import { useStore } from '@/store/StoreContext';
import { colors, radius, space } from '@/theme';
import { daysLeft, fmtLong, todayISO } from '@/lib/date';
import { confirm } from '@/lib/confirm';
import { EventItem } from '@/types';

const KINDS = ['Митап', 'Хакатон', 'Конференция', 'Воркшоп', 'Выставка'] as const;

export default function Events() {
  const { data, me, memberById, addEvent, updateEvent, toggleGoing, removeEvent } = useStore();
  const [form, setForm] = useState<EventItem | 'new' | null>(null);

  const list = useMemo(
    () => [...data.events].sort((a, b) => daysLeft(a.date) - daysLeft(b.date)),
    [data.events]
  );

  return (
    <Screen>
      <View style={styles.head}>
        <View>
          <T variant="label">Куда идём вместе</T>
          <T variant="display">Ивенты</T>
        </View>
        <IconButton icon="add" tone="red" size={52} onPress={() => setForm('new')} />
      </View>

      {list.map((e, idx) => {
        const going = e.going.map((id) => memberById(id)!).filter(Boolean);
        const iGo = e.going.includes(me.id);
        const dl = daysLeft(e.date);
        const featured = idx === 0;
        return (
          <Pressable key={e.id} onPress={() => setForm(e)} style={[styles.card, featured ? { backgroundColor: colors.red } : null]}>
            <View style={styles.cardHead}>
              <Tag label={e.kind} color={featured ? 'rgba(255,255,255,0.9)' : colors.red} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T variant="small" color={featured ? 'rgba(255,255,255,0.8)' : colors.textDim} style={{ fontWeight: '700' }}>
                  {dl < 0 ? 'прошёл' : dl === 0 ? 'сегодня' : `через ${dl} дн`}
                </T>
                <Ionicons name="create-outline" size={16} color={featured ? 'rgba(255,255,255,0.7)' : colors.textFaint} />
              </View>
            </View>

            <T variant="h1" color={featured ? '#fff' : colors.text} style={{ marginTop: 12 }}>
              {e.title}
            </T>

            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={15} color={featured ? 'rgba(255,255,255,0.8)' : colors.textDim} />
              <T variant="small" color={featured ? 'rgba(255,255,255,0.85)' : colors.textDim} style={{ marginLeft: 6 }}>
                {fmtLong(e.date)}
              </T>
              <Ionicons name="location-outline" size={15} color={featured ? 'rgba(255,255,255,0.8)' : colors.textDim} style={{ marginLeft: 14 }} />
              <T variant="small" color={featured ? 'rgba(255,255,255,0.85)' : colors.textDim} style={{ marginLeft: 6 }}>
                {e.location}
              </T>
            </View>

            <View style={styles.cardBottom}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {going.length ? <AvatarStack members={going} size={28} /> : null}
                <T variant="small" color={featured ? 'rgba(255,255,255,0.85)' : colors.textDim} style={{ marginLeft: going.length ? 10 : 0 }}>
                  {going.length ? `${going.length} идёт` : 'пока никто'}
                </T>
              </View>
              <Pressable
                onPress={() => toggleGoing(e.id)}
                style={[
                  styles.goBtn,
                  iGo
                    ? featured
                      ? { backgroundColor: '#fff' }
                      : { backgroundColor: colors.red }
                    : featured
                    ? { backgroundColor: 'rgba(0,0,0,0.25)' }
                    : { backgroundColor: colors.surfaceHi },
                ]}
              >
                <T variant="small" color={iGo && featured ? colors.red : '#fff'} style={{ fontWeight: '800' }}>
                  {iGo ? 'Я иду ✓' : 'Я иду'}
                </T>
              </Pressable>
            </View>
          </Pressable>
        );
      })}

      <EventFormSheet
        key={form === 'new' ? 'new' : form?.id}
        target={form}
        onClose={() => setForm(null)}
        onSubmit={(p, id) => {
          if (id) updateEvent(id, p);
          else addEvent(p);
          setForm(null);
        }}
        onDelete={(id) => confirm('Удалить ивент?', '', () => { removeEvent(id); setForm(null); })}
      />
    </Screen>
  );
}

function EventFormSheet({
  target,
  onClose,
  onSubmit,
  onDelete,
}: {
  target: EventItem | 'new' | null;
  onClose: () => void;
  onSubmit: (p: { title: string; kind: string; date: string; location: string }, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const existing = target && target !== 'new' ? target : null;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [kind, setKind] = useState<string>(existing?.kind ?? 'Митап');
  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [location, setLocation] = useState(existing?.location ?? '');

  return (
    <Sheet visible={target !== null} onClose={onClose} title={existing ? 'Ивент' : 'Новый ивент'}>
      <Field label="Название" value={title} onChangeText={setTitle} placeholder="Напр. Design Weekend" autoFocus={!existing} />
      <ChipSelect label="Тип" options={KINDS} value={kind as any} onChange={(v) => setKind(v)} />
      <Field label="Место" value={location} onChangeText={setLocation} placeholder="Город, площадка или «Онлайн»" />
      <DateField label="Дата" value={date} onChange={setDate} />
      <Button
        title={existing ? 'Сохранить' : 'Добавить ивент'}
        tone="red"
        disabled={!title.trim() || !location.trim()}
        onPress={() => onSubmit({ title: title.trim(), kind, date, location: location.trim() }, existing?.id)}
      />
      {existing ? (
        <Button title="Удалить" tone="ghost" icon="trash-outline" style={{ marginTop: 10 }} onPress={() => onDelete(existing.id)} />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: space.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: space.lg, marginBottom: space.sm },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  goBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: radius.pill },
});
