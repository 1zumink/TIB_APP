import {
  AnimatedCount,
  MotionPressable as Pressable,
  MotionView,
  PulseDot,
  duration,
  useSelectProgress,
} from '@/components/motion';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Avatar, IconButton, T } from '@/components/ui';
import { TibCard3D } from '@/components/TibCard3D';
import { ProfileSheet } from '@/components/ProfileSheet';
import { useStore } from '@/store/StoreContext';
import { confirm } from '@/lib/confirm';
import { colors, radius, space, type } from '@/theme';

export default function Profile() {
  const router = useRouter();
  const { me, data, mode, setCurrentUser, resetAll, signOut, updateProfile } = useStore();
  const [editing, setEditing] = useState(false);
  // Bumped on open so the form re-reads the profile; keying on `editing` would
  // remount the sheet as it closes and swallow its exit animation.
  const [editSeq, setEditSeq] = useState(0);
  const openEditor = () => {
    setEditSeq((n) => n + 1);
    setEditing(true);
  };

  const myDeadlines = data.deadlines.filter((d) => d.ownerId === me.id && d.status === 'active').length;
  const myTasks = data.tasks.filter((t) => t.assigneeId === me.id && t.status !== 'done').length;
  const myLogs = data.log.filter((l) => l.authorId === me.id).length;

  return (
    <Screen>
      <View style={styles.head}>
        <View style={{ flex: 1 }}>
          <T variant="display">{me.name}</T>
          <T variant="body" color={colors.textDim} style={{ marginTop: 2 }}>
            {[me.role, me.roleSecondary].filter(Boolean).join(' · ')}
          </T>
        </View>
        <IconButton icon="create-outline" tone="surface" onPress={openEditor} />
      </View>

      {/* 3D card */}
      <MotionView style={styles.cardStage}>
        <TibCard3D member={me} />
        <View style={styles.hint}>
          <Ionicons name="finger-print" size={14} color={colors.textFaint} />
          <T variant="small" color={colors.textFaint} style={{ marginLeft: 6 }}>
            Крути карточку пальцем
          </T>
        </View>
      </MotionView>

      {/* Stats */}
      <MotionView delay={40} style={styles.stats}>
        <Pressable style={styles.stat} onPress={() => router.push('/deadlines')}>
          <AnimatedCount value={myDeadlines} style={type.h1} />
          <T variant="small">дедлайнов</T>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.stat} onPress={() => router.push('/tasks')}>
          <AnimatedCount value={myTasks} style={type.h1} />
          <T variant="small">тасок</T>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.stat} onPress={() => router.push('/worklog')}>
          <AnimatedCount value={myLogs} style={type.h1} />
          <T variant="small">в логе</T>
        </Pressable>
      </MotionView>

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
        {data.members.map((m) => (
          // In demo mode you can switch identity; in cloud mode it's just the roster.
          <MemberChip
            key={m.id}
            member={m}
            active={m.id === me.id}
            onPress={mode === 'local' ? () => setCurrentUser(m.id) : undefined}
          />
        ))}
      </View>

      {/* Connection status */}
      <View style={styles.statusRow}>
        {/* A live connection gets a heartbeat; an offline one stays still. */}
        {mode === 'supabase' ? (
          <PulseDot size={8} color="#12B76A" />
        ) : (
          <View style={[styles.dot, { backgroundColor: colors.textFaint }]} />
        )}
        <T variant="small">
          {mode === 'supabase' ? 'Синхронизация с сервером включена' : 'Локальный режим (без синхронизации)'}
        </T>
      </View>

      {mode === 'supabase' ? (
        <Pressable
          style={styles.reset}
          haptic="tap"
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
          haptic="tap"
          onPress={() => confirm('Сбросить данные?', 'Вернём демо-контент и удалим все изменения.', resetAll, 'Сбросить')}
        >
          <Ionicons name="refresh" size={16} color={colors.textDim} />
          <T variant="small" style={{ marginLeft: 8 }}>
            Сбросить к демо-данным
          </T>
        </Pressable>
      )}
      {/* The card above is the preview; this is the form behind it. */}
      <ProfileSheet
        key={editSeq}
        visible={editing}
        member={me}
        onClose={() => setEditing(false)}
        onSave={(patch) => {
          updateProfile(patch);
          setEditing(false);
        }}
      />
    </Screen>
  );
}

/**
 * Roster chip. Switching identity recolours border, fill and name together —
 * three properties on one 200ms curve so it reads as one object changing,
 * not three things re-rendering.
 */
function MemberChip({
  member,
  active,
  onPress,
}: {
  member: Parameters<typeof Avatar>[0]['member'];
  active: boolean;
  onPress?: () => void;
}) {
  const p = useSelectProgress(active, duration.chip);
  const box = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.value, [0, 1], [colors.stroke, colors.red]),
    backgroundColor: interpolateColor(p.value, [0, 1], [colors.surface, colors.redSoft]),
  }));
  const name = useAnimatedStyle(() => ({
    color: interpolateColor(p.value, [0, 1], [colors.text, colors.red]),
  }));
  const chip = (
    <Animated.View style={[styles.memberChip, box]}>
      <Avatar member={member} size={26} />
      <Animated.Text style={[{ fontSize: 15, lineHeight: 21, fontWeight: '700', marginLeft: 8 }, name]}>
        {member?.name}
      </Animated.Text>
    </Animated.View>
  );
  if (!onPress) return chip;
  return (
    <Pressable onPress={onPress} haptic={active ? false : 'select'}>
      {chip}
    </Pressable>
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
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.lg },
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
