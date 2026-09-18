const MONTHS_RU = [
  'янв', 'фев', 'мар', 'апр', 'мая', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];
const MONTHS_RU_FULL = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
];
export const WEEKDAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const WEEKDAYS_RU_FULL = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота',
];

export function todayISO(): string {
  return toISO(new Date());
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** "12 сен" */
export function fmtShort(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}`;
}

/** "12 сентября" */
export function fmtLong(iso: string): string {
  const d = parseISO(iso);
  return `${d.getDate()} ${MONTHS_RU_FULL[d.getMonth()]}`;
}

/** days from today (negative = past) */
export function daysLeft(iso: string): number {
  const now = parseISO(todayISO());
  const target = parseISO(iso);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

/** Human "осталось" label + urgency */
export function countdown(iso: string): { text: string; urgent: boolean; overdue: boolean } {
  const d = daysLeft(iso);
  if (d < 0) return { text: `−${Math.abs(d)} дн`, urgent: true, overdue: true };
  if (d === 0) return { text: 'Сегодня', urgent: true, overdue: false };
  if (d === 1) return { text: 'Завтра', urgent: true, overdue: false };
  if (d <= 3) return { text: `${d} дн`, urgent: true, overdue: false };
  return { text: `${d} дн`, urgent: false, overdue: false };
}

export function fmtDateTime(ms: number): string {
  const d = new Date(ms);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getDate()} ${MONTHS_RU[d.getMonth()]}, ${time}`;
}

/** next 7 days starting today, as Date objects */
export function upcomingDays(count = 5): Date[] {
  const out: Date[] = [];
  const base = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d);
  }
  return out;
}
