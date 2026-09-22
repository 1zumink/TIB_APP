import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase, MEMBER_PALETTE } from '../lib/supabase';
import { AppData, ID, Member } from '../types';
import { fromDeadline, fromEvent, fromLog, fromProfile, fromTask, fromWorkHour } from './mappers';
import { composeName } from '../lib/member';
import type { StoreContextValue } from './StoreContext';

const EMPTY: AppData = {
  currentUserId: '',
  members: [],
  deadlines: [],
  workHours: [],
  tasks: [],
  events: [],
  log: [],
};

/**
 * Supabase-backed store: same shape as the local one, plus auth.
 * Reads/writes go to Postgres; realtime keeps every device in sync.
 */
export function useSupabaseStore(): StoreContextValue {
  const sb = supabase!; // provider only mounts this when configured
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;

  const userId = session?.user?.id;

  /* ---------- auth session ---------- */
  useEffect(() => {
    let mounted = true;
    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  /* ---------- ensure a profile row exists for this user ---------- */
  const ensureProfile = useCallback(async () => {
    if (!session?.user) return;
    const uid = session.user.id;
    const { data: existing } = await sb.from('profiles').select('id').eq('id', uid).maybeSingle();
    if (existing) return;
    const meta: any = session.user.user_metadata || {};
    const name = meta.name || session.user.email?.split('@')[0] || 'TIB';
    const color = MEMBER_PALETTE[Math.floor(Math.random() * MEMBER_PALETTE.length)];
    await sb.from('profiles').insert({ id: uid, name, role: meta.role || 'Designer', color });
  }, [sb, session]);

  /* ---------- fetch everything ---------- */
  const refetch = useCallback(async () => {
    if (!userId) return;
    const [p, d, w, t, e, l] = await Promise.all([
      sb.from('profiles').select('*'),
      sb.from('deadlines').select('*'),
      sb.from('work_hours').select('*'),
      sb.from('tasks').select('*'),
      sb.from('events').select('*'),
      sb.from('journal').select('*'),
    ]);
    setData({
      currentUserId: userId,
      members: (p.data || []).map(fromProfile),
      deadlines: (d.data || []).map(fromDeadline),
      workHours: (w.data || []).map(fromWorkHour),
      tasks: (t.data || []).map(fromTask),
      events: (e.data || []).map(fromEvent),
      log: (l.data || []).map(fromLog),
    });
    setReady(true);
  }, [sb, userId]);

  // debounced refetch for realtime bursts
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => refetch(), 250);
  }, [refetch]);

  /* ---------- initial load + realtime ---------- */
  useEffect(() => {
    if (!userId) {
      setReady(false);
      setData(EMPTY);
      return;
    }
    (async () => {
      await ensureProfile();
      await refetch();
    })();

    const ch = sb
      .channel('tib-all')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => scheduleRefetch())
      .subscribe();

    return () => {
      sb.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /* ---------- helpers ---------- */
  /*
   * Writes used to fail in silence — a rejected query only reached the console,
   * so on the device a save looked like it worked and then quietly reverted on
   * the next refetch. Anything the user pressed a button for has to say so when
   * it doesn't happen.
   */
  const write = useCallback(
    async (p: PromiseLike<{ error: any }>, what?: string) => {
      const { error } = await p;
      if (!error) {
        scheduleRefetch();
        return;
      }
      console.warn('[supabase]', error.message);
      const missingColumn = /column .* does not exist|schema cache/i.test(error.message ?? '');
      Alert.alert(
        what ? `Не удалось сохранить: ${what}` : 'Не удалось сохранить',
        missingColumn
          ? 'В базе нет нужных колонок. Прогони supabase/migration-card-fields.sql в SQL Editor.'
          : error.message
      );
    },
    [scheduleRefetch]
  );

  const value = useMemo<StoreContextValue>(() => {
    const me =
      data.members.find((m) => m.id === data.currentUserId) ||
      ({ id: userId || '', name: '…', role: '', code: '', color: '#FF0044' } as unknown as Member);
    const memberById = (id: ID) => data.members.find((m) => m.id === id);

    return {
      mode: 'supabase',
      data,
      ready: ready && authReady,
      me,
      memberById,

      // auth
      authReady,
      needsAuth: authReady && !session,
      signIn: async (email, password) => {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        return { error: error?.message };
      },
      signUp: async (email, password, name) => {
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        return { error: error?.message };
      },
      signOut: async () => {
        await sb.auth.signOut();
      },
      updateProfile: (patch) => {
        if (!userId) return;
        const current = data.members.find((m) => m.id === userId);
        const firstName = patch.firstName ?? current?.firstName ?? '';
        const lastName = patch.lastName ?? current?.lastName ?? '';
        // Columns are snake_case; `name` is written alongside so the server copy
        // stays consistent with the two fields it is composed from.
        const row: Record<string, unknown> = { name: composeName(firstName, lastName, current?.name ?? '') };
        if (patch.firstName !== undefined) row.first_name = patch.firstName;
        if (patch.lastName !== undefined) row.last_name = patch.lastName;
        if (patch.role !== undefined) row.role = patch.role;
        if (patch.roleSecondary !== undefined) row.role_secondary = patch.roleSecondary;
        if (patch.code !== undefined) row.code = patch.code;
        if (patch.color !== undefined) row.color = patch.color;
        if (patch.phone !== undefined) row.phone = patch.phone;
        if (patch.website !== undefined) row.website = patch.website;
        if (patch.handle !== undefined) row.handle = patch.handle;
        if (patch.photoUrl !== undefined) row.photo_url = patch.photoUrl;
        if (patch.signature !== undefined) row.signature = patch.signature;
        write(sb.from('profiles').update(row).eq('id', userId), 'профиль');
      },

      setCurrentUser: () => {}, // no-op with auth (you are the logged-in user)

      // deadlines
      addDeadline: (input) =>
        write(
          sb.from('deadlines').insert({
            title: input.title,
            project: input.project,
            date: input.date,
            owner_id: input.ownerId,
            status: 'active',
          })
        ),
      updateDeadline: (id, patch) => {
        const row: any = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.project !== undefined) row.project = patch.project;
        if (patch.date !== undefined) row.date = patch.date;
        if (patch.ownerId !== undefined) row.owner_id = patch.ownerId;
        if (patch.status !== undefined) row.status = patch.status;
        write(sb.from('deadlines').update(row).eq('id', id));
      },
      toggleDeadlineDone: (id) => {
        const d = dataRef.current.deadlines.find((x) => x.id === id);
        write(sb.from('deadlines').update({ status: d?.status === 'done' ? 'active' : 'done' }).eq('id', id));
      },
      removeDeadline: (id) => write(sb.from('deadlines').delete().eq('id', id)),

      // work hours
      addWorkHour: (input) =>
        write(
          sb.from('work_hours').insert({
            title: input.title,
            weekday: input.weekday,
            start_time: input.start,
            end_time: input.end,
            attendees: userId ? [userId] : [],
            created_by: userId,
          })
        ),
      updateWorkHour: (id, patch) => {
        const row: any = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.weekday !== undefined) row.weekday = patch.weekday;
        if (patch.start !== undefined) row.start_time = patch.start;
        if (patch.end !== undefined) row.end_time = patch.end;
        write(sb.from('work_hours').update(row).eq('id', id));
      },
      toggleAttend: (id) => {
        if (!userId) return;
        const w = dataRef.current.workHours.find((x) => x.id === id);
        if (!w) return;
        const has = w.attendees.includes(userId);
        const attendees = has ? w.attendees.filter((a) => a !== userId) : [...w.attendees, userId];
        write(sb.from('work_hours').update({ attendees }).eq('id', id));
      },
      removeWorkHour: (id) => write(sb.from('work_hours').delete().eq('id', id)),

      // tasks
      addTask: (input) =>
        write(
          sb.from('tasks').insert({
            title: input.title,
            description: input.description,
            date: input.date ?? null,
            status: 'open',
            created_by: userId,
          })
        ),
      updateTask: (id, patch) => {
        const row: any = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.date !== undefined) row.date = patch.date ?? null;
        write(sb.from('tasks').update(row).eq('id', id));
      },
      claimTask: (id) =>
        write(sb.from('tasks').update({ status: 'claimed', assignee_id: userId }).eq('id', id)),
      releaseTask: (id) =>
        write(sb.from('tasks').update({ status: 'open', assignee_id: null }).eq('id', id)),
      completeTask: (id) => write(sb.from('tasks').update({ status: 'done' }).eq('id', id)),
      removeTask: (id) => write(sb.from('tasks').delete().eq('id', id)),

      // events
      addEvent: (input) =>
        write(
          sb.from('events').insert({
            title: input.title,
            kind: input.kind,
            date: input.date,
            location: input.location,
            added_by: userId,
            going: userId ? [userId] : [],
          })
        ),
      updateEvent: (id, patch) => {
        const row: any = {};
        if (patch.title !== undefined) row.title = patch.title;
        if (patch.kind !== undefined) row.kind = patch.kind;
        if (patch.date !== undefined) row.date = patch.date;
        if (patch.location !== undefined) row.location = patch.location;
        write(sb.from('events').update(row).eq('id', id));
      },
      toggleGoing: (id) => {
        if (!userId) return;
        const e = dataRef.current.events.find((x) => x.id === id);
        if (!e) return;
        const has = e.going.includes(userId);
        const going = has ? e.going.filter((g) => g !== userId) : [...e.going, userId];
        write(sb.from('events').update({ going }).eq('id', id));
      },
      removeEvent: (id) => write(sb.from('events').delete().eq('id', id)),

      // log
      addLog: ({ description, project }) =>
        write(
          sb.from('journal').insert({
            description,
            project: project ?? null,
            author_id: userId,
          })
        ),
      updateLog: (id, patch) => {
        const row: any = {};
        if (patch.description !== undefined) row.description = patch.description;
        if (patch.project !== undefined) row.project = patch.project ?? null;
        write(sb.from('journal').update(row).eq('id', id));
      },
      removeLog: (id) => write(sb.from('journal').delete().eq('id', id)),

      resetAll: () => {}, // not used in cloud mode
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, ready, authReady, session, userId, sb, write]);

  return value;
}
