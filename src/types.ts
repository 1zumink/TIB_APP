export type ID = string;

export interface Member {
  id: ID;
  name: string;
  role: string;
  /** short code shown on the TIB_ID card, e.g. "TIB-004" */
  code: string;
  /** accent color for avatar */
  color: string;
}

export type DeadlineStatus = 'active' | 'done';

export interface Deadline {
  id: ID;
  title: string;
  project: string;
  /** ISO date string (yyyy-mm-dd) */
  date: string;
  ownerId: ID;
  status: DeadlineStatus;
  createdAt: number;
}

/** A recurring / one-off common work session ("общие часы") */
export interface WorkHour {
  id: ID;
  title: string;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number;
  start: string; // "18:00"
  end: string; // "21:00"
  /** members who confirmed they join */
  attendees: ID[];
  createdBy: ID;
}

export type TaskStatus = 'open' | 'claimed' | 'done';

export interface Task {
  id: ID;
  title: string;
  description: string;
  date?: string; // deadline iso
  status: TaskStatus;
  /** who took it, if any */
  assigneeId?: ID;
  createdBy: ID;
  createdAt: number;
}

export interface EventItem {
  id: ID;
  title: string;
  kind: string; // Хакатон / Митап / Конференция ...
  date: string; // iso
  location: string;
  addedBy: ID;
  /** members going */
  going: ID[];
}

export interface LogEntry {
  id: ID;
  description: string;
  authorId: ID;
  /** epoch ms when logged */
  at: number;
  project?: string;
}

export interface AppData {
  members: Member[];
  currentUserId: ID;
  deadlines: Deadline[];
  workHours: WorkHour[];
  tasks: Task[];
  events: EventItem[];
  log: LogEntry[];
}
