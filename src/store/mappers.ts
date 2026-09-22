import { Deadline, EventItem, LogEntry, Member, Task, WorkHour } from '../types';
import { splitName } from '../lib/member';

/** Map Supabase rows (snake_case) to app types (camelCase). */

export const fromProfile = (r: any): Member => {
  // Rows written before the card fields existed only have `name`.
  const legacy = splitName(r.name ?? '');
  return {
    id: r.id,
    name: r.name ?? '',
    firstName: r.first_name || legacy.firstName,
    lastName: r.last_name || legacy.lastName,
    role: r.role ?? '',
    roleSecondary: r.role_secondary ?? '',
    code: r.code ?? '',
    color: r.color ?? '#FF0044',
    phone: r.phone ?? '',
    website: r.website ?? '',
    handle: r.handle ?? '',
    // A `blob:` handle only lives inside the tab that made it — rows written
    // before portraits were uploaded still carry one. Read them as "no photo".
    photoUrl: r.photo_url && !r.photo_url.startsWith('blob:') ? r.photo_url : undefined,
    signature: (r.signature as Member['signature']) || 'ilya',
  };
};

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
