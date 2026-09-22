import { AppData } from '../types';
import { toISO } from '../lib/date';

function rel(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export const SEED: AppData = {
  currentUserId: 'm1',
  members: [
    { id: 'm1', name: 'Илья Ланг', firstName: 'Илья', lastName: 'Ланг', role: 'Art-Director', roleSecondary: 'Product Designer', code: '148867694252', color: '#FF0044', phone: '+7 (916) 611-47-35', website: 'iloveilyalang.com', handle: '@kkklounada', signature: 'ilya' },
    { id: 'm2', name: 'Тарас', firstName: 'Тарас', lastName: '', role: 'Product Designer', roleSecondary: '', code: 'TIB-002', color: '#4C6FFF', phone: '', website: '', handle: '', signature: 'ilya' },
    { id: 'm3', name: 'Боря', firstName: 'Боря', lastName: '', role: 'Motion Designer', roleSecondary: '', code: 'TIB-003', color: '#12B76A', phone: '', website: '', handle: '', signature: 'ilya' },
    { id: 'm4', name: 'Матвей', firstName: 'Матвей', lastName: '', role: 'Illustrator', roleSecondary: '', code: 'TIB-004', color: '#F79009', phone: '', website: '', handle: '', signature: 'ilya' },
    { id: 'm5', name: 'Лёха', firstName: 'Лёха', lastName: '', role: 'UX / Research', roleSecondary: '', code: 'TIB-005', color: '#9E77ED', phone: '', website: '', handle: '', signature: 'ilya' },
  ],
  deadlines: [
    { id: 'd1', title: 'Финальный кейс для Behance', project: 'Portfolio', date: rel(2), ownerId: 'm1', status: 'active', createdAt: Date.now() },
    { id: 'd2', title: 'Отправить лендинг клиенту', project: 'Nova Studio', date: rel(0), ownerId: 'm2', status: 'active', createdAt: Date.now() },
    { id: 'd3', title: 'Гайдлайн бренда v2', project: 'TIB Brand', date: rel(6), ownerId: 'm3', status: 'active', createdAt: Date.now() },
    { id: 'd4', title: 'Иллюстрации для мерча', project: 'Merch drop', date: rel(-1), ownerId: 'm4', status: 'active', createdAt: Date.now() },
  ],
  workHours: [
    { id: 'w1', title: 'Общий co-work', weekday: 2, start: '18:00', end: '21:00', attendees: ['m1', 'm2', 'm3'], createdBy: 'm1' },
    { id: 'w2', title: 'Дизайн-ревью', weekday: 4, start: '19:00', end: '20:30', attendees: ['m1', 'm2', 'm5'], createdBy: 'm2' },
    { id: 'w3', title: 'Спринт по проектам', weekday: 6, start: '12:00', end: '17:00', attendees: ['m1', 'm2', 'm3', 'm4', 'm5'], createdBy: 'm1' },
  ],
  tasks: [
    { id: 't1', title: 'Собрать мудборд для дропа', description: 'Нужно 20–30 референсов в фигме, стиль — helvetica swag, чб + красный.', date: rel(3), status: 'open', createdBy: 'm1', createdAt: Date.now() },
    { id: 't2', title: 'Экспорт ассетов под Android', description: 'Иконки в 1x/2x/3x, положить в общий диск.', date: rel(5), status: 'claimed', assigneeId: 'm3', createdBy: 'm2', createdAt: Date.now() },
    { id: 't3', title: 'Написать тексты для сайта', description: 'Секции about / works / contact. Тон — дерзкий, коротко.', status: 'open', createdBy: 'm2', createdAt: Date.now() },
  ],
  events: [
    { id: 'e1', title: 'Design Weekend', kind: 'Конференция', date: rel(9), location: 'Москва, Хлебозавод', addedBy: 'm1', going: ['m1', 'm2'] },
    { id: 'e2', title: 'Product Hackathon', kind: 'Хакатон', date: rel(16), location: 'Онлайн', addedBy: 'm5', going: ['m5'] },
    { id: 'e3', title: 'Meetup: Motion & 3D', kind: 'Митап', date: rel(4), location: 'СПб, Севкабель', addedBy: 'm3', going: ['m3', 'm1', 'm4'] },
  ],
  log: [
    { id: 'l1', description: 'Собрал первую версию лендинга Nova', authorId: 'm2', at: Date.now() - 1000 * 60 * 60 * 26, project: 'Nova Studio' },
    { id: 'l2', description: 'Отрисовал 6 иконок для мерча', authorId: 'm4', at: Date.now() - 1000 * 60 * 60 * 50, project: 'Merch drop' },
    { id: 'l3', description: 'Настроил анимации переходов', authorId: 'm3', at: Date.now() - 1000 * 60 * 60 * 5, project: 'TIB Brand' },
  ],
};
