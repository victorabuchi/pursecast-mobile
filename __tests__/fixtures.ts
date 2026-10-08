import { buildForecast } from '../lib/money/forecast';
import type { Money, PlanData, ForksData, SpendingData, WorthData, ForecastData, SetupData, BanksData, StatementsData, Shell } from '../lib/types';

// A small, realistic account: pay, rent, a subscription, a dollar plan that
// varies, budgets, some history, a debt, a plan event and a wish.
export const today = '2026-10-08';
const rec = (id: string, name: string, amount: number, categoryId: string, extra: object = {}) => ({ id, name, amount, cadence: 'monthly' as const, nextDate: '2026-10-25', categoryId, paused: false, variable: false, skips: [], priceCurrency: null, priceAmount: null, advances: [], ...extra });
export const recurring = [rec('r1', 'Salary', 290000, 'c-inc'), rec('r2', 'Rent', -95000, 'c-house', { nextDate: '2026-11-01' }), rec('r3', 'Netflix', -1399, 'c-subs', { nextDate: '2026-10-12' }), rec('r4', 'Render', -2198, 'c-subs', { variable: true, priceCurrency: 'USD', priceAmount: 2500, nextDate: '2026-11-03' })];
export const cats = [
  { id: 'c-inc', name: 'Income', kind: 'income', budget: 0, color: '#15803d', position: 0 },
  { id: 'c-house', name: 'Housing', kind: 'fixed', budget: 0, color: '#0f7a63', position: 1 },
  { id: 'c-subs', name: 'Subscriptions', kind: 'fixed', budget: 0, color: '#d946ef', position: 2 },
  { id: 'c-food', name: 'Groceries', kind: 'flex', budget: 30000, color: '#16a34a', position: 3 },
  { id: 'c-out', name: 'Eating out', kind: 'flex', budget: 15000, color: '#f97316', position: 4 },
];
const entry = (id: string, date: string, amount: number, note: string, categoryId: string | null, extra: object = {}) => ({ id, date, amount, note, categoryId, recurringId: null, debtId: null, mood: null, createdAt: `${date}T10:00:00.000Z`, source: null, ...extra });
export const entries = [
  entry('e1', '2026-10-07', -1250, 'Lunch', 'c-out'),
  entry('e2', '2026-10-05', -4210, 'Groceries', 'c-food', { mood: 'love' }),
  entry('e3', '2026-10-02', -2500, 'Dinner', 'c-out', { mood: 'regret' }),
  entry('e4', '2026-10-01', 290000, 'Salary', 'c-inc', { recurringId: 'r1' }),
  entry('e5', '2026-09-20', -3300, 'Shoes', null),
  entry('e6', '2026-09-18', -1800, 'Coffee beans', 'c-food', { source: 'bank' }),
];
export const events = [
  { id: 'ev1', date: '2026-12-20', name: 'Anna & Jon wedding', tag: 'Wedding', source: 'manual', hidden: false, saveMonthly: 12000, saveFrom: '2026-10', items: [{ id: 'i1', name: 'Outfit', amount: 12000 }, { id: 'i2', name: 'Gift', amount: 8000 }], cost: 20000 },
  { id: 'ev2', date: '2027-02-10', name: 'Trip to Porto', tag: 'Travel', source: 'calendar', hidden: false, saveMonthly: null, saveFrom: null, items: [{ id: 'i3', name: 'Flights', amount: 24000 }], cost: 24000 },
];
export const debts = [
  { id: 'd1', person: 'Sam', party: 'person', photo: null, direction: 'lent', amount: 5000, note: 'Concert', dueDate: '2026-10-30', settledAt: null, createdAt: '2026-09-01T00:00:00.000Z', paid: 0, left: 5000 },
  { id: 'd2', person: 'Nordea', party: 'institution', photo: null, direction: 'borrowed', amount: 100000, note: null, dueDate: null, settledAt: null, createdAt: '2026-08-01T00:00:00.000Z', paid: 20000, left: 80000 },
];
const fcRec = recurring.map((r) => ({ id: r.id, name: r.name, amount: r.amount, cadence: r.cadence, nextDate: r.nextDate, skips: r.skips, advances: [] }));
const budgets = [{ id: 'c-food', name: 'Groceries', budget: 30000, spent: 4210, cuts: {} }, { id: 'c-out', name: 'Eating out', budget: 15000, spent: 3750, cuts: {} }];
const forecast = buildForecast({ today, balance: 234000, cushion: 0, recurring: fcRec, budgets, events: events.map((e) => ({ id: e.id, name: e.name, date: e.date, cost: e.cost, saveMonthly: e.saveMonthly, saveFrom: e.saveFrom, source: e.source })), debts: [{ id: 'd2', person: 'Nordea', remaining: 80000, dueDate: '2026-11-15' }], days: 366 });

export const money: Money = {
  me: { id: 'u1', name: 'Victor', email: 'v@x.com', currency: 'EUR', timezone: 'Europe/Helsinki', balance: 234000, balanceSetAt: '2026-09-01T00:00:00.000Z', cushion: 0, calendarUrl: null, calendarAt: null, notepad: '<div>Call the bank</div>', notepadAt: null, photo: null, today },
  cats, recurring, entries, events, debts, budgets, balance: 234000, forecast, rates: { USD: 1, EUR: 0.91, GBP: 0.78 }, advances: [], mainBalance: 200000, mainName: 'Main',
  accounts: [{ id: 'a1', name: 'Savings', kind: 'savings', currency: 'EUR', balance: 50000, inForecast: false, updatedAt: '2026-10-01T00:00:00.000Z', value: 50000 }, { id: 'a2', name: 'Travel card', kind: 'card', currency: 'USD', balance: 30000, inForecast: true, updatedAt: '2026-10-01T00:00:00.000Z', value: 27300 }],
};

export const forecastData: ForecastData = { money, todos: [{ incomeId: 'r1', due: '2026-10-25' }] };
export const spendingData: SpendingData = { money, pauseNote: null };
export const worthData: WorthData = { money, movedFrom: [], notes: [{ id: 'n1', text: 'You are saving for Japan.', audio: null, categoryId: 'c-out', until: '2026-12-01', shown: 2, skipped: 1, saved: 2500, createdAt: '2026-09-01T00:00:00.000Z' }] };
export const forksData: ForksData = { money, forks: [{ id: 'f1', name: 'Move to Austin', startDate: '2026-10-08', oneTime: -300000 }], effects: [{ id: 'fe1', forkId: 'f1', name: 'Rent', monthly: -20000 }, { id: 'fe2', forkId: 'f1', name: 'Salary', monthly: 80000 }] };
export const planData: PlanData = {
  money, national: 3.1,
  wishes: [{ id: 'w1', name: 'Acne Studios sweater', price: 28000, url: 'https://example.com', photo: null, priority: 1, eventId: null, boughtAt: null }, { id: 'w2', name: 'Laptop stand', price: 4500, url: null, photo: null, priority: 3, eventId: 'ev1', boughtAt: null }],
  todos: [{ id: 't1', text: 'Pay back Sam', amount: 5000, incomeId: 'r1', due: '2026-10-25', priority: 1, doneAt: null }, { id: 't2', text: 'Book the train', amount: null, incomeId: null, due: '2026-10-08', priority: 2, doneAt: null }, { id: 't3', text: 'Winter coat', amount: 12000, incomeId: null, due: '2026-10-17', priority: 3, doneAt: null }],
};
export const setupFirst: SetupData = { me: money.me, editing: false, cats: [], recurring: [], debts: [], balance: 0, advances: [], accounts: [], rates: money.rates };
export const setupEdit: SetupData = { me: money.me, editing: true, cats, recurring, debts, balance: 234000, advances: [], accounts: [{ id: 'a1', name: 'Savings', kind: 'savings', currency: 'EUR', balance: 50000, inForecast: false, updatedAt: '2026-10-01T00:00:00.000Z' }], rates: money.rates };
export const banksData: BanksData = {
  me: { id: 'u1', timezone: 'Europe/Helsinki', today }, ready: true, setupProblem: '', app: { environment: 'SANDBOX', error: '' },
  links: [{ id: 'l1', aspspName: 'Revolut', logo: null, status: 'active', error: null, lastSyncAt: '2026-10-08T06:00:00.000Z', validUntil: '2027-03-01T00:00:00.000Z' }],
  accounts: [{ id: 'ba1', linkId: 'l1', name: 'Revolut Pro', iban: 'LT123456789012345678', currency: 'EUR', balance: 123456, role: 'main' }],
};
const t = (id: string, date: string, place: string, amount: number, category: string) => ({ id, date, description: `${place} card payment`, place, amount, category });
const months = ['2026-06', '2026-07', '2026-08', '2026-09'];
export const statementsData: StatementsData = {
  me: { currency: 'EUR', today }, aiReady: true, statements: [{ id: 's1', name: 'Revolut 2026' }], selected: null, tracked: ['Netflix'],
  txns: months.flatMap((m, i) => [t(`a${i}`, `${m}-03`, 'NETFLIX.COM', -1399, 'Subscriptions'), t(`b${i}`, `${m}-05`, 'K-Market', -6400, 'Groceries'), t(`c${i}`, `${m}-25`, 'Employer Oy', 290000, 'Income'), t(`d${i}`, `${m}-12`, 'Cafe Regatta', -450, 'Coffee')]),
};
export const shell: Shell = { setUp: true, name: 'Victor', email: 'v@x.com', currency: 'EUR', today, photo: null, notepad: '<div>Call the bank</div>', notepadAt: null, bell: [{ id: 'e3', note: 'Dinner', amount: -2500, date: '2026-10-02', category: 'Eating out' }], palette: [{ group: 'Go to', label: 'Money Weather', href: '/forecast' }], reminders: [{ key: 'k1', kind: 'todo', title: '1 thing to do today', body: 'Book the train', href: '/plan#todo' }] };
export const settingsData = { me: money.me, hasPassword: true, weeklyEmail: false, emailReady: false };
