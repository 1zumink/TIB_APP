import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Button, IconButton, T, Tag } from '@/components/ui';
import { Sheet } from '@/components/Sheet';
import { Field } from '@/components/form';
import { useStore } from '@/store/StoreContext';
import { colors, radius, space } from '@/theme';
import { fmtDateTime } from '@/lib/date';
import { exportLogToExcel } from '@/lib/export';
import { confirm } from '@/lib/confirm';
import { LogEntry } from '@/types';

export default function WorkLog() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, me, memberById, addLog, updateLog, removeLog } = useStore();
  const [form, setForm] = useState<LogEntry | 'new' | null>(null);
  const [exporting, setExporting] = useState(false);

  const sorted = [...data.log].sort((a, b) => b.at - a.at);

  const onExport = async () => {
    setExporting(true);
    try {
      const res = await exportLogToExcel({ log: data.log, memberById });
      if (!res.ok) {
        if (res.reason === 'empty') Alert.alert('Лог пуст', 'Добавь хотя бы одну запись перед экспортом.');
        else if (res.reason === 'sharing-unavailable') Alert.alert('Недоступно', 'Шаринг файлов недоступен на этом устройстве.');
        else Alert.alert('Не получилось', 'Попробуй ещё раз.');
      }
    } catch (e: any) {
      Alert.alert('Ошибка экспорта', String(e?.message ?? e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="chevron-back" tone="surface" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <T variant="h2">Лог работ</T>
        <IconButton icon="add" tone="red" onPress={() => setForm('new')} />
      </View>

      <View style={styles.exportRow}>
        <View style={{ flex: 1 }}>
          <T variant="small">{sorted.length} записей</T>
          <T variant="body" style={{ fontWeight: '700' }}>Кто что сделал</T>
        </View>
        <Button title="Экспорт в Excel" tone="primary" icon="download-outline" loading={exporting} onPress={onExport} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {sorted.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Ionicons name="document-text-outline" size={34} color={colors.textFaint} />
            <T variant="small" style={{ marginTop: 10 }}>Пусто. Жми + и запиши, что сделал.</T>
          </View>
        ) : (
          sorted.map((l) => {
            const author = memberById(l.authorId);
            const mine = l.authorId === me.id;
            const inner = (
              <>
                <Avatar member={author} size={38} />
                <View style={{ flex: 1, marginLeft: space.md }}>
                  <T variant="body" style={{ fontWeight: '600' }}>{l.description}</T>
                  <View style={styles.metaRow}>
                    <T variant="small" style={{ fontWeight: '700' }} color={colors.text}>
                      {author?.name}
                    </T>
                    <T variant="small"> · {fmtDateTime(l.at)}</T>
                    {l.project ? <Tag label={l.project} color={colors.textFaint} /> : null}
                  </View>
                </View>
                {mine ? <Ionicons name="create-outline" size={18} color={colors.textFaint} /> : null}
              </>
            );
            return mine ? (
              <Pressable key={l.id} style={styles.row} onPress={() => setForm(l)}>
                {inner}
              </Pressable>
            ) : (
              <View key={l.id} style={styles.row}>{inner}</View>
            );
          })
        )}
      </ScrollView>

      <LogFormSheet
        key={form === 'new' ? 'new' : form?.id}
        target={form}
        authorName={me.name}
        onClose={() => setForm(null)}
        onSubmit={(p, id) => {
          if (id) updateLog(id, p);
          else addLog(p);
          setForm(null);
        }}
        onDelete={(id) => confirm('Удалить запись?', '', () => { removeLog(id); setForm(null); })}
      />
    </View>
  );
}

function LogFormSheet({
  target,
  onClose,
  onSubmit,
  onDelete,
  authorName,
}: {
  target: LogEntry | 'new' | null;
  onClose: () => void;
  onSubmit: (p: { description: string; project?: string }, id?: string) => void;
  onDelete: (id: string) => void;
  authorName: string;
}) {
  const existing = target && target !== 'new' ? target : null;
  const [desc, setDesc] = useState(existing?.description ?? '');
  const [project, setProject] = useState(existing?.project ?? '');

  return (
    <Sheet visible={target !== null} onClose={onClose} title={existing ? 'Запись' : 'Что сделал?'}>
      {!existing ? (
        <View style={styles.autoRow}>
          <Ionicons name="person-circle" size={18} color={colors.red} />
          <T variant="small" style={{ marginLeft: 6 }}>
            Запишем на <T variant="small" color={colors.text} style={{ fontWeight: '800' }}>{authorName}</T> и поставим время автоматически
          </T>
        </View>
      ) : null}
      <Field label="Описание" value={desc} onChangeText={setDesc} placeholder="Напр. Отрисовал 6 иконок для мерча" multiline autoFocus={!existing} />
      <Field label="Проект (необязательно)" value={project} onChangeText={setProject} placeholder="Напр. Merch drop" />
      <Button
        title={existing ? 'Сохранить' : 'Добавить в лог'}
        tone="red"
        disabled={!desc.trim()}
        onPress={() => onSubmit({ description: desc.trim(), project: project.trim() || undefined }, existing?.id)}
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
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingBottom: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.redSoft,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.lg,
  },
});
