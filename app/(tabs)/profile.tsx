import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Avatar, T } from '@/components/ui';
import { TibCard3D } from '@/components/TibCard3D';
import { useStore } from '@/store/StoreContext';
import { confirm } from '@/lib/confirm';
import { colors, radius, space } from '@/theme';

export default function Profile() {
  const router = useRouter();
  const { me, data, mode, setCurrentUser, resetAll, signOut } = useStore();

  const myDeadlines = data.deadlines.filter((d) => d.ownerId === me.id && d.status === 'active').length;
  const myTasks = data.tasks.filter((t) => t.assigneeId === me.id && t.status !== 'done').length;
  const myLogs = data.log.filter((l) => l.authorId === me.id).length;

  return (
    <Screen>
      <View style={styles.head}>
        <View>
          <T variant="label">Профиль</T>
          <T variant="display">{me.name}</T>
          <T variant="body" color={colors.textDim} style={{ marginTop: 2 }}>
            {me.role}
          </T>
        </View>
      </View>

      {/* 3D card */}
      <View style={styles.cardStage}>
        <TibCard3D member={me} />
        <View style={styles.hint}>
          <Ionicons name="finger-print" size={14} color={colors.textFaint} />
          <T variant="small" color={colors.textFaint} style={{ marginLeft: 6 }}>
            Крути карточку пальцем
          </T>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Pressable style={styles.stat} onPress={() => router.push('/deadlines')}>
          <T variant="h1">{myDeadlines}</T>
          <T variant="small">дедлайнов</T>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.stat} onPress={() => router.push('/tasks')}>
          <T variant="h1">{myTasks}</T>
          <T variant="small">тасок</T>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.stat} onPress={() => router.push('/worklog')}>
          <T variant="h1">{myLogs}</T>
          <T variant="small">в логе</T>
        </Pressable>
      </View>

      {/* Nav links */}
      <View style={{ gap: space.md, marginTop: space.xl }}>
        <NavRow icon="calendar" title="Общие часы работы" subtitle="Расписание co-work сессий" onPress={() => router.push('/schedule')} />
        <NavRow icon="document-text" title="Лог работ" subtitle="История + экспорт в Excel" onPress={() => router.push('/worklog')} />
      </View>

      {/* Team roster */}
      <T variant="label" style={{ marginTop: space.xxl, marginBottom: space.md }}>
        {mode === 'supabase' ? 'Команда' : 'Кто ты сейчас (демо-режим)'}
      </T>
      <View style={styles.memberGrid}>
        {data.members.map((m) => {
          const active = m.id === me.id;
          const chip = (
            <View
              style={[styles.memberChip, active ? { borderColor: colors.red, backgroundColor: colors.redSoft } : null]}
            >
              <Avatar member={m} size={26} />
              <T variant="body" style={{ fontWeight: '700', marginLeft: 8 }} color={active ? colors.red : colors.text}>
                {m.name}
              </T>
            </View>
          );
          // In demo mode you can switch identity; in cloud mode it's just the roster.
          return mode === 'local' ? (
            <Pressable key={m.id} onPress={() => setCurrentUser(m.id)}>
              {chip}
            </Pressable>
          ) : (
            <View key={m.id}>{chip}</View>
          );
        })}
      </View>

      {/* Connection status */}
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: mode === 'supabase' ? '#12B76A' : colors.textFaint }]} />
        <T variant="small">
          {mode === 'supabase' ? 'Синхронизация с сервером включена' : 'Локальный режим (без синхронизации)'}
        </T>
      </View>

      {mode === 'supabase' ? (
        <Pressable
          style={styles.reset}
          onPress={() => confirm('Выйти из аккаунта?', '', () => signOut?.(), 'Выйти')}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.textDim} />
          <T variant="small" style={{ marginLeft: 8 }}>
            Выйти
          </T>
        </Pressable>
      ) : (
        <Pressable
          style={styles.reset}
          onPress={() => confirm('Сбросить данные?', 'Вернём демо-контент и удалим все изменения.', resetAll, 'Сбросить')}
        >
          <Ionicons name="refresh" size={16} color={colors.textDim} />
          <T variant="small" style={{ marginLeft: 8 }}>
            Сбросить к демо-данным
          </T>
        </Pressable>
      )}
    </Screen>
  );
}

function NavRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navRow} onPress={onPress}>
      <View style={styles.navIcon}>
        <Ionicons name={icon} size={20} color={colors.red} />
      </View>
      <View style={{ flex: 1, marginLeft: space.md }}>
        <T variant="title">{title}</T>
        <T variant="small">{subtitle}</T>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { marginBottom: space.lg },
  cardStage: { alignItems: 'center', paddingVertical: space.lg },
  hint: { flexDirection: 'row', alignItems: 'center', marginTop: space.md },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: space.lg,
    marginTop: space.md,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, height: 34, backgroundColor: colors.stroke },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.redSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingRight: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  reset: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.lg,
    paddingVertical: space.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: space.xxl,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
