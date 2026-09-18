import { Deadline, EventItem, LogEntry, Member, Task, WorkHour } from '../types';

/** Map Supabase rows (snake_case) to app types (camelCase). */

export const fromProfile = (r: any): Member => ({
  id: r.id,
  name: r.name,
  role: r.role,
  code: r.code,
  color: r.color,
});

export const fromDeadline = (r: any): Deadline => ({
  id: r.id,
  title: r.title,
  project: r.project ?? '',
  date: r.date,
  ownerId: r.owner_id,
  status: r.status,
  createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
});

export const fromWorkHour = (r: any): WorkHour => ({
  id: r.id,
  title: r.title,
  weekday: r.weekday,
  start: r.start_time,
  end: r.end_time,
  attendees: r.attendees ?? [],
  createdBy: r.created_by,
});

export const fromTask = (r: any): Task => ({
  id: r.id,
  title: r.title,
  description: r.description ?? '',
  date: r.date ?? undefined,
  status: r.status,
  assigneeId: r.assignee_id ?? undefined,
  createdBy: r.created_by,
  createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
});

export const fromEvent = (r: any): EventItem => ({
  id: r.id,
  title: r.title,
  kind: r.kind,
  date: r.date,
  location: r.location ?? '',
  addedBy: r.added_by,
  going: r.going ?? [],
});

export const fromLog = (r: any): LogEntry => ({
  id: r.id,
  description: r.description,
  authorId: r.author_id,
  at: r.at ? new Date(r.at).getTime() : Date.now(),
  project: r.project ?? undefined,
});
