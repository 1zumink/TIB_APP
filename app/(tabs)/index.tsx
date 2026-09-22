import {
  AnimatedCount,
  MotionPressable as Pressable,
  MotionRow,
  MotionView,
  duration,
  fadeIn,
  fadeOut,
  haptics,
  spring,
  springTo,
  timing,
  useSelectProgress,
} from '@/components/motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { AvatarStack, Button, Card, IconButton, T, Tag } from '@/components/ui';
import { useStore } from '@/store/StoreContext';
import { colors, radius, space, type } from '@/theme';
import {
  WEEKDAYS_RU,
  countdown,
  daysLeft,
  fmtLong,
  fmtShort,
  toISO,
  todayISO,
} from '@/lib/date';

const CELL = 58;
const GAP = 8;
const STEP = CELL + GAP;
const PAST = 7; // days shown before today
const FUTURE = 45; // days shown after today

export default function Home() {
  const router = useRouter();
  const { me, data, memberById, toggleAttend } = useStore();

  const today = todayISO();
  const [selected, setSelected] = useState(today);
  const [farFromToday, setFarFromToday] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const todayWeekday = new Date().getDay();

  // build the scrollable range of days
  const days = useMemo(() => {
    const arr: Date[] = [];
    const base = new Date();
    for (let i = -PAST; i <= FUTURE; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, []);
  const todayX = Math.max(0, (PAST - 1) * STEP);

  // start the strip near today
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollTo({ x: todayX, animated: false }), 0);
    return () => clearTimeout(t);
  }, [todayX]);

  const goToday = () => {
    setSelected(today);
    scrollRef.current?.scrollTo({ x: todayX, animated: true });
  };

  // dashboard data (used when today is selected)
  const todaySessions = data.workHours.filter((w) => w.weekday === todayWeekday);
  const nextSession = useMemo(() => {
    if (todaySessions.length) return todaySessions[0];
    const sorted = [...data.workHours].sort((a, b) => {
      const da = (a.weekday - todayWeekday + 7) % 7 || 7;
      const db = (b.weekday - todayWeekday + 7) % 7 || 7;
      return da - db;
    });
    return sorted[0];
  }, [data.workHours, todayWeekday]);
  const attendees = nextSession ? nextSession.attendees.map((id) => memberById(id)!).filter(Boolean) : [];
  const iAttend = nextSession?.attendees.includes(me.id);
  const nextDeadline = useMemo(
    () => [...data.deadlines].filter((d) => d.status === 'active').sort((a, b) => daysLeft(a.date) - daysLeft(b.date))[0],
    [data.deadlines]
  );

  // agenda for the selected (non-today) day
  const agenda = useMemo(() => {
    const deadlines = data.deadlines.filter((d) => d.date === selected);
    const tasks = data.tasks.filter((t) => t.date === selected);
    const events = data.events.filter((e) => e.date === selected);
    const weekday = new Date(selected + 'T00:00:00').getDay();
    const sessions = data.workHours.filter((w) => w.weekday === weekday);
    return { deadlines, tasks, events, sessions };
  }, [data, selected]);
  const agendaEmpty =
    agenda.deadlines.length + agenda.tasks.length + agenda.events.length + agenda.sessions.length === 0;

  const openTasks = data.tasks.filter((t) => t.status === 'open').length;
  const isToday = selected === today;

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <T variant="body" color={colors.textDim}>
            Привет, {me.name} 👋
          </T>
          <T variant="display" style={{ marginTop: 4 }}>
            Погнали{'\n'}продвигаться
          </T>
        </View>
        <Pressable onPress={() => router.push('/profile')}>
          <View style={[styles.avatarBtn, { backgroundColor: me.color }]}>
            <T variant="h2" color="#fff">
              {me.name.slice(0, 1)}
            </T>
          </View>
        </Pressable>
      </View>

      {/* Day strip */}
      <View style={styles.stripRow}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={STEP}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={(e) => setFarFromToday(Math.abs(e.nativeEvent.contentOffset.x - todayX) > STEP * 2.5)}
          // Headroom for the selected cell: it scales to 1.04 and lifts 2px,
          // and the spring overshoots past both — without this the ScrollView
          // clips the top of the day you just picked.
          contentContainerStyle={{ gap: GAP, paddingRight: space.xl, paddingVertical: 8 }}
        >
          {days.map((d, i) => {
            const iso = toISO(d);
            return (
              <DayCell
                key={i}
                day={d}
                selected={iso === selected}
                today={iso === today}
                onPress={() => {
                  if (iso !== selected) haptics.select();
                  setSelected(iso);
                }}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Back to today */}
      {!isToday || farFromToday ? (
        <Animated.View entering={fadeIn} exiting={fadeOut}>
          <Pressable style={styles.todayBtn} haptic="tap" onPress={goToday}>
            <Ionicons name="arrow-up" size={14} color={colors.white} style={{ transform: [{ rotate: '-45deg' }] }} />
            <T variant="small" color={colors.white} style={{ fontWeight: '800', marginLeft: 6 }}>
              Сегодня
            </T>
          </Pressable>
        </Animated.View>
      ) : null}

      <MotionView key={selected}>
        {isToday ? (
          <>
            {/* Today / next common hours */}
            <Pressable onPress={() => router.push('/schedule')}>
              <Card tone="paper" style={{ marginBottom: space.sm }}>
                <View style={styles.rowBetween}>
                  <T variant="label" color="rgba(0,0,0,0.5)">
                    {todaySessions.length ? 'Сегодня работаем вместе' : 'Ближайший co-work'}
                  </T>
                  <Ionicons name="arrow-forward" size={18} color={colors.black} />
                </View>
                {nextSession ? (
                  <>
                    <T variant="h1" color={colors.black} style={{ marginTop: 8 }}>
                      {nextSession.title}
                    </T>
                    <View style={[styles.rowBetween, { marginTop: 14 }]}>
                      <View style={styles.timePill}>
                        <Ionicons name="time-outline" size={15} color={colors.black} />
                        <T variant="body" color={colors.black} style={{ fontWeight: '700', marginLeft: 6 }}>
                          {WEEKDAYS_RU[nextSession.weekday]} · {nextSession.start}–{nextSession.end}
                        </T>
                      </View>
                      <AvatarStack members={attendees} size={30} />
                    </View>
                    <View style={{ marginTop: 16 }}>
                      <Button
                        title={iAttend ? 'Я в деле ✓' : 'Присоединиться'}
                        tone={iAttend ? 'red' : 'primary'}
                        onPress={() => toggleAttend(nextSession.id)}
                        style={{ backgroundColor: iAttend ? colors.red : colors.black }}
                      />
                    </View>
                  </>
                ) : (
                  <T variant="body" color="rgba(0,0,0,0.6)" style={{ marginTop: 10 }}>
                    Пока нет общих часов. Добавь первый слот →
                  </T>
                )}
              </Card>
            </Pressable>

            {/* Next deadline */}
            {nextDeadline ? (
              <Pressable onPress={() => router.push('/deadlines')}>
                <Card tone="red" style={{ marginBottom: space.sm }}>
                  <View style={styles.rowBetween}>
                    <T variant="label" color="rgba(255,255,255,0.7)">
                      Ближайший дедлайн · {nextDeadline.project}
                    </T>
                    <View style={styles.cdPill}>
                      <T variant="small" color="#fff" style={{ fontWeight: '800' }}>
                        {countdown(nextDeadline.date).text}
                      </T>
                    </View>
                  </View>
                  <T variant="h1" color="#fff" style={{ marginTop: 10 }}>
                    {nextDeadline.title}
                  </T>
                  <T variant="body" color="rgba(255,255,255,0.75)" style={{ marginTop: 8 }}>
                    Ответственный: {memberById(nextDeadline.ownerId)?.name} · {fmtShort(nextDeadline.date)}
                  </T>
                </Card>
              </Pressable>
            ) : null}
          </>
        ) : (
          /* Selected-day agenda */
          <View style={{ marginBottom: space.sm }}>
            <T variant="h2" style={{ marginBottom: space.md, textTransform: 'capitalize' }}>
              {fmtLong(selected)}
            </T>

            {agendaEmpty ? (
              <View style={styles.emptyDay}>
                <Ionicons name="cafe-outline" size={30} color={colors.textFaint} />
                <T variant="body" color={colors.textDim} style={{ marginTop: 10 }}>
                  На этот день ничего нет 🎉
                </T>
              </View>
            ) : (
              <View style={{ gap: space.sm }}>
                {agenda.sessions.map((w, i) => (
                  <MotionRow key={w.id} index={i} style={styles.agendaRow}>
                    <View style={[styles.agendaDot, { backgroundColor: colors.paper }]} />
                    <View style={{ flex: 1 }}>
                      <T variant="title">{w.title}</T>
                      <T variant="small">Co-work · {w.start}–{w.end}</T>
                    </View>
                    <Tag label="часы" color={colors.textDim} />
                  </MotionRow>
                ))}
                {agenda.deadlines.map((d, i) => (
                  <MotionRow key={d.id} index={agenda.sessions.length + i}>
                    <Pressable style={styles.agendaRow} onPress={() => router.push('/deadlines')}>
                      <View style={[styles.agendaDot, { backgroundColor: colors.red }]} />
                      <View style={{ flex: 1 }}>
                        <T variant="title">{d.title}</T>
                        <T variant="small">Дедлайн · {memberById(d.ownerId)?.name}</T>
                      </View>
                      <Tag label={d.project} color={colors.red} />
                    </Pressable>
                  </MotionRow>
                ))}
                {agenda.tasks.map((t, i) => (
                  <MotionRow key={t.id} index={agenda.sessions.length + agenda.deadlines.length + i}>
                    <Pressable style={styles.agendaRow} onPress={() => router.push('/tasks')}>
                      <View style={[styles.agendaDot, { backgroundColor: '#4C6FFF' }]} />
                      <View style={{ flex: 1 }}>
                        <T variant="title">{t.title}</T>
                        <T variant="small">
                          Таска · {t.status === 'open' ? 'свободна' : t.status === 'done' ? 'готово' : `делает ${memberById(t.assigneeId || '')?.name ?? ''}`}
                        </T>
                      </View>
                    </Pressable>
                  </MotionRow>
                ))}
                {agenda.events.map((e, i) => (
                  <MotionRow
                    key={e.id}
                    index={agenda.sessions.length + agenda.deadlines.length + agenda.tasks.length + i}
                  >
                    <Pressable style={styles.agendaRow} onPress={() => router.push('/events')}>
                      <View style={[styles.agendaDot, { backgroundColor: '#12B76A' }]} />
                      <View style={{ flex: 1 }}>
                        <T variant="title">{e.title}</T>
                        <T variant="small">{e.kind} · {e.location}</T>
                      </View>
                    </Pressable>
                  </MotionRow>
                ))}
              </View>
            )}
          </View>
        )}

      </MotionView>

      {/* Quick links */}
      <View style={styles.quickRow}>
        <Pressable style={styles.quickCard} onPress={() => router.push('/tasks')}>
          <View style={[styles.quickIcon, { backgroundColor: colors.redSoft }]}>
            <Ionicons name="checkbox" size={20} color={colors.red} />
          </View>
          <AnimatedCount value={openTasks} style={[type.h1, { marginTop: 14 }]} />
          <T variant="small">открытых тасок</T>
        </Pressable>
        <Pressable style={styles.quickCard} onPress={() => router.push('/worklog')}>
          <View style={[styles.quickIcon, { backgroundColor: colors.surfaceHi }]}>
            <Ionicons name="document-text" size={20} color={colors.white} />
          </View>
          <AnimatedCount value={data.log.length} style={[type.h1, { marginTop: 14 }]} />
          <T variant="small">записей в логе</T>
        </Pressable>
      </View>

      {/* Events teaser */}
      <Pressable onPress={() => router.push('/events')} style={{ marginTop: space.sm }}>
        <Card tone="ghost" style={styles.eventsTeaser}>
          <View style={{ flex: 1 }}>
            <T variant="label">Ивенты команды</T>
            <T variant="title" style={{ marginTop: 4 }}>
              {data.events.length} впереди — митапы, хакатоны
            </T>
          </View>
          <IconButton icon="arrow-forward" tone="red" onPress={() => router.push('/events')} />
        </Card>
      </Pressable>
    </Screen>
  );
}

/** Day-strip cell whose background + text smoothly fade on selection. */
function DayCell({
  day,
  selected,
  today,
  onPress,
}: {
  day: Date;
  selected: boolean;
  today: boolean;
  onPress: () => void;
}) {
  const p = useSelectProgress(selected);
  // The lift springs separately from the colour fade: colour explains *which*
  // day is current, the lift is what makes the tap feel received.
  const lift = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    lift.value = selected ? springTo(1, spring.pop) : timing(0, duration.exit);
  }, [selected, lift]);
  const restNum = today ? colors.red : colors.text;
  const restDow = today ? colors.red : colors.textDim;
  const bg = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.value, [0, 1], [colors.surface, colors.white]),
    transform: [{ scale: 1 + Math.max(0, lift.value) * 0.04 }, { translateY: -Math.max(0, lift.value) * 2 }],
  }));
  const numColor = useAnimatedStyle(() => ({ color: interpolateColor(p.value, [0, 1], [restNum, colors.black]) }));
  const dowColor = useAnimatedStyle(() => ({ color: interpolateColor(p.value, [0, 1], [restDow, colors.black]) }));
  return (
    <Pressable onPress={onPress} style={[styles.day, !selected && today ? styles.dayToday : null, bg] as any}>
      <Animated.Text style={[type.h2, numColor]}>{day.getDate()}</Animated.Text>
      <Animated.Text style={[type.small, dowColor]}>{WEEKDAYS_RU[day.getDay()]}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: space.md,
  },
  avatarBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Pulled up by half the strip's new padding so the header spacing stays put.
  stripRow: { marginTop: -4, marginBottom: space.xs, marginHorizontal: -space.xl, paddingLeft: space.xl },
  day: {
    width: CELL,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  daySelected: { backgroundColor: colors.white },
  dayToday: { borderWidth: 1.5, borderColor: colors.red },
  todayBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.red,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    marginBottom: space.md,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
  cdPill: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  emptyDay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 26,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.md,
  },
  agendaDot: { width: 10, height: 10, borderRadius: 5 },
  quickRow: { flexDirection: 'row', gap: space.md },
  quickCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.lg,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
});
