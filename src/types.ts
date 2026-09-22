import type { SignatureKey } from './components/cardArt';

export type ID = string;

export interface Member {
  id: ID;
  /**
   * Display name used by lists, avatars and the log. Always kept in sync with
   * firstName + lastName — see composeName.
   */
  name: string;
  /** printed on the card front under "first name:" */
  firstName: string;
  /** printed on the card front under "last name:" */
  lastName: string;
  /** position, first line — printed on the card front under "position:" */
  role: string;
  /** position, second line — the design prints two, as separate lines */
  roleSecondary: string;
  /** card number, printed as "NO.<code>" on both faces */
  code: string;
  /** accent color for avatar */
  color: string;
  /** printed on the card front under "number:", and again on the back */
  phone: string;
  /** personal site, printed bottom-left on the back */
  website: string;
  /** @handle, printed bottom-right on the back */
  handle: string;
  /** portrait for the card front; the bundled placeholder is used when empty */
  photoUrl?: string;
  /** whose mark is printed across the card */
  signature: SignatureKey;
}

/**
 * The editable half of a profile. `name` is absent on purpose — it is always
 * recomposed from firstName + lastName so the two can never disagree.
 */
export type ProfilePatch = Partial<
  Pick<
    Member,
    | 'firstName'
    | 'lastName'
    | 'role'
    | 'roleSecondary'
    | 'code'
    | 'color'
    | 'phone'
    | 'website'
    | 'handle'
    | 'photoUrl'
    | 'signature'
  >
>;

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
