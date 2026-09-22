import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, Deadline, EventItem, ID, LogEntry, Member, ProfilePatch, Task, WorkHour } from '../types';
import { SEED } from './seed';
import { composeName } from '../lib/member';
import { isSupabaseConfigured } from '../lib/supabase';
import { useSupabaseStore } from './useSupabaseStore';

const STORAGE_KEY = 'tib.app.data.v1';

function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface StoreContextValue {
  /** which backend is active */
  mode: 'local' | 'supabase';
  data: AppData;
  ready: boolean;
  me: Member;
  memberById: (id: ID) => Member | undefined;
  setCurrentUser: (id: ID) => void;

  // auth (meaningful only in supabase mode)
  authReady: boolean;
  needsAuth: boolean;
  signIn?: (email: string, password: string) => Promise<{ error?: string }>;
  signUp?: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signOut?: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => void;

  // deadlines
  addDeadline: (input: Omit<Deadline, 'id' | 'createdAt' | 'status'>) => void;
  updateDeadline: (id: ID, patch: Partial<Deadline>) => void;
  toggleDeadlineDone: (id: ID) => void;
  removeDeadline: (id: ID) => void;

  // work hours
  addWorkHour: (input: Omit<WorkHour, 'id' | 'attendees' | 'createdBy'>) => void;
  updateWorkHour: (id: ID, patch: Partial<Pick<WorkHour, 'title' | 'weekday' | 'start' | 'end'>>) => void;
  toggleAttend: (id: ID) => void;
  removeWorkHour: (id: ID) => void;

  // tasks
  addTask: (input: Omit<Task, 'id' | 'createdAt' | 'status' | 'assigneeId' | 'createdBy'>) => void;
  updateTask: (id: ID, patch: Partial<Pick<Task, 'title' | 'description' | 'date'>>) => void;
  claimTask: (id: ID) => void;
  releaseTask: (id: ID) => void;
  completeTask: (id: ID) => void;
  removeTask: (id: ID) => void;

  // events
  addEvent: (input: Omit<EventItem, 'id' | 'going' | 'addedBy'>) => void;
  updateEvent: (id: ID, patch: Partial<Pick<EventItem, 'title' | 'kind' | 'date' | 'location'>>) => void;
  toggleGoing: (id: ID) => void;
  removeEvent: (id: ID) => void;

  // log
  addLog: (input: { description: string; project?: string }) => void;
  updateLog: (id: ID, patch: { description?: string; project?: string }) => void;
  removeLog: (id: ID) => void;

  resetAll: () => void;
}

const Ctx = createContext<StoreContextValue | null>(null);

/* ============================================================
 * LOCAL MODE — AsyncStorage demo (no backend configured)
 * ============================================================ */
function useLocalStore(): StoreContextValue {
  const [data, setData] = useState<AppData>(SEED);
  const [ready, setReady] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setData({ ...SEED, ...(JSON.parse(raw) as AppData) });
      } catch {
        // ignore, fall back to seed
      } finally {
        hydrated.current = true;
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  return useMemo<StoreContextValue>(() => {
    const me = data.members.find((m) => m.id === data.currentUserId) || data.members[0];
    const memberById = (id: ID) => data.members.find((m) => m.id === id);

    return {
      mode: 'local',
      data,
      ready,
      me,
      memberById,
      authReady: true,
      needsAuth: false,
      updateProfile: (patch) =>
        setData((d) => ({
          ...d,
          members: d.members.map((m) => {
            if (m.id !== d.currentUserId) return m;
            const next = { ...m, ...patch };
            // Recompose rather than trust a passed-in name: the two must not drift.
            return { ...next, name: composeName(next.firstName, next.lastName, m.name) };
          }),
        })),
      setCurrentUser: (id) => setData((d) => ({ ...d, currentUserId: id })),

      addDeadline: (input) =>
        setData((d) => ({
          ...d,
          deadlines: [{ ...input, id: uid('d'), status: 'active', createdAt: Date.now() }, ...d.deadlines],
        })),
      updateDeadline: (id, patch) =>
        setData((d) => ({
          ...d,
          deadlines: d.deadlines.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      toggleDeadlineDone: (id) =>
        setData((d) => ({
          ...d,
          deadlines: d.deadlines.map((x) =>
            x.id === id ? { ...x, status: x.status === 'done' ? 'active' : 'done' } : x
          ),
        })),
      removeDeadline: (id) =>
        setData((d) => ({ ...d, deadlines: d.deadlines.filter((x) => x.id !== id) })),

      addWorkHour: (input) =>
        setData((d) => ({
          ...d,
          workHours: [
            ...d.workHours,
            { ...input, id: uid('w'), attendees: [d.currentUserId], createdBy: d.currentUserId },
          ],
        })),
      updateWorkHour: (id, patch) =>
        setData((d) => ({
          ...d,
          workHours: d.workHours.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      toggleAttend: (id) =>
        setData((d) => ({
          ...d,
          workHours: d.workHours.map((w) => {
            if (w.id !== id) return w;
            const has = w.attendees.includes(d.currentUserId);
            return {
              ...w,
              attendees: has
                ? w.attendees.filter((a) => a !== d.currentUserId)
                : [...w.attendees, d.currentUserId],
            };
          }),
        })),
      removeWorkHour: (id) =>
        setData((d) => ({ ...d, workHours: d.workHours.filter((w) => w.id !== id) })),

      addTask: (input) =>
        setData((d) => ({
          ...d,
          tasks: [
            { ...input, id: uid('t'), status: 'open', createdBy: d.currentUserId, createdAt: Date.now() },
            ...d.tasks,
          ],
        })),
      updateTask: (id, patch) =>
        setData((d) => ({
          ...d,
          tasks: d.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      claimTask: (id) =>
        setData((d) => ({
          ...d,
          tasks: d.tasks.map((t) =>
            t.id === id ? { ...t, status: 'claimed', assigneeId: d.currentUserId } : t
          ),
        })),
      releaseTask: (id) =>
        setData((d) => ({
          ...d,
          tasks: d.tasks.map((t) => (t.id === id ? { ...t, status: 'open', assigneeId: undefined } : t)),
        })),
      completeTask: (id) =>
        setData((d) => ({
          ...d,
          tasks: d.tasks.map((t) => (t.id === id ? { ...t, status: 'done' } : t)),
        })),
      removeTask: (id) => setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) })),

      addEvent: (input) =>
        setData((d) => ({
          ...d,
          events: [
            { ...input, id: uid('e'), addedBy: d.currentUserId, going: [d.currentUserId] },
            ...d.events,
          ],
        })),
      updateEvent: (id, patch) =>
        setData((d) => ({
          ...d,
          events: d.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      toggleGoing: (id) =>
        setData((d) => ({
          ...d,
          events: d.events.map((e) => {
            if (e.id !== id) return e;
            const has = e.going.includes(d.currentUserId);
            return {
              ...e,
              going: has ? e.going.filter((g) => g !== d.currentUserId) : [...e.going, d.currentUserId],
            };
          }),
        })),
      removeEvent: (id) => setData((d) => ({ ...d, events: d.events.filter((e) => e.id !== id) })),

      addLog: ({ description, project }) =>
        setData((d) => ({
          ...d,
          log: [
            { id: uid('l'), description, project, authorId: d.currentUserId, at: Date.now() },
            ...d.log,
          ],
        })),
      updateLog: (id, patch) =>
        setData((d) => ({
          ...d,
          log: d.log.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      removeLog: (id) => setData((d) => ({ ...d, log: d.log.filter((l) => l.id !== id) })),

      resetAll: () => setData(SEED),
    };
  }, [data, ready]);
}

/* ============================================================
 * Providers
 * ============================================================ */
function LocalProvider({ children }: { children: React.ReactNode }) {
  const value = useLocalStore();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const value = useSupabaseStore();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // isSupabaseConfigured is a build-time constant, so we never switch hooks at runtime.
  return isSupabaseConfigured ? (
    <SupabaseProvider>{children}</SupabaseProvider>
  ) : (
    <LocalProvider>{children}</LocalProvider>
  );
}

export function useStore(): StoreContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used within StoreProvider');
  return v;
}
