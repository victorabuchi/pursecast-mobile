import type { Cadence } from './money/recurrence';
import type { FcBudget, Forecast } from './money/forecast';
import type { Rates } from './money/currencies';

// The shapes the web's money load returns (src/lib/money/load.ts), as JSON.

export type MoneyMe = {
  id: string;
  name: string;
  email: string;
  currency: string;
  timezone: string;
  balance: number | null;
  balanceSetAt: string | null;
  cushion: number;
  calendarUrl: string | null;
  calendarAt: string | null;
  notepad: string;
  notepadAt: string | null;
  photo: string | null;
  today: string;
};

export type Cat = { id: string; name: string; kind: string; budget: number; color: string; position: number };
export type EntryRow = { id: string; date: string; amount: number; note: string; categoryId: string | null; recurringId: string | null; debtId: string | null; mood: string | null; createdAt: string; source: string | null };
export type DebtRow = { id: string; person: string; party: string; photo: string | null; direction: string; amount: number; note: string | null; dueDate: string | null; settledAt: string | null; createdAt: string; paid: number; left: number };
export type RecurringRow = {
  id: string;
  name: string;
  amount: number;
  cadence: Cadence;
  nextDate: string;
  categoryId: string | null;
  paused: boolean;
  variable: boolean;
  skips: string[];
  // Billed in another currency: the price as billed, in its cents.
  priceCurrency: string | null;
  priceAmount: number | null;
  // pending: arrives on takenOn and is not in the balance yet.
  advances: Array<{ id: string; amount: number; payday: string; takenOn: string; pending: boolean }>;
};
export type EventRow = { id: string; date: string; name: string; tag: string; source: string; hidden: boolean; saveMonthly: number | null; saveFrom: string | null; items: Array<{ id: string; name: string; amount: number }>; cost: number };
export type AccountRow = { id: string; name: string; kind: string; currency: string; balance: number; inForecast: boolean; updatedAt: string; value: number };
export type AdvanceRow = { id: string; recurringId: string | null; amount: number; payday: string; takenOn: string; pending: boolean };

export type Money = {
  me: MoneyMe & { balance: number; balanceSetAt: string };
  cats: Cat[];
  recurring: RecurringRow[];
  entries: EntryRow[];
  events: EventRow[];
  debts: DebtRow[];
  budgets: FcBudget[];
  balance: number;
  forecast: Forecast;
  rates: Rates;
  advances: AdvanceRow[];
  // The main account alone, and the other accounts with their value in the
  // main currency. balance above is main plus the ones that count.
  mainBalance: number;
  // The bank the main balance comes from, when one is connected.
  mainName: string;
  accounts: AccountRow[];
};

// What each screen's data route answers: the money load plus that page's extras.
export type ForecastData = { money: Money; todos: Array<{ incomeId: string | null; due: string | null }> };

// The signed-in frame: the bell, search palette, floating note, profile picture.
export type BellItem = { id: string; note: string; amount: number; date: string; category: string | null };
export type PaletteItem = { group: string; label: string; hint?: string; href: string };
export type Shell = {
  setUp: boolean;
  name: string;
  email: string;
  currency: string;
  today: string;
  photo: string | null;
  notepad: string;
  notepadAt: string | null;
  bell: BellItem[];
  palette: PaletteItem[];
  reminders: import('./money/reminders').Reminder[];
};

export type SpendingData = {
  money: Money;
  pauseNote: { id: string; text: string; audio: string | null; createdAt: string; skipped: number; saved: number } | null;
};

export type NoteRow = { id: string; text: string; audio: string | null; categoryId: string | null; until: string | null; shown: number; skipped: number; saved: number; createdAt: string };
export type WorthData = { money: Money; movedFrom: string[]; notes: NoteRow[] };

export type ForksData = {
  money: Money;
  forks: Array<{ id: string; name: string; startDate: string; oneTime: number }>;
  effects: Array<{ id: string; forkId: string; name: string; monthly: number }>;
};

export type WishRow = { id: string; name: string; price: number; url: string | null; photo: string | null; priority: number; eventId: string | null; boughtAt: string | null };
export type TodoRow = { id: string; text: string; amount: number | null; incomeId: string | null; due: string; priority: number; doneAt: string | null };
export type PlanData = { money: Money; national: number; wishes: WishRow[]; todos: TodoRow[] };

export type SetupData = {
  me: MoneyMe;
  editing: boolean;
  cats: Cat[];
  recurring: RecurringRow[];
  debts: DebtRow[];
  balance: number;
  advances: AdvanceRow[];
  accounts: Array<Omit<AccountRow, 'value'>>;
  rates: Rates;
};

export type BanksData = {
  me: { id: string; timezone: string; today: string };
  ready: boolean;
  setupProblem: string;
  app: { environment: string | null; error: string };
  links: Array<{ id: string; aspspName: string; logo: string | null; status: string; error: string | null; lastSyncAt: string | null; validUntil: string | null }>;
  accounts: Array<{ id: string; linkId: string; name: string; iban: string | null; currency: string; balance: number | null; role: string }>;
};
export type BankInfo = { name: string; country: string; logo: string; beta: boolean };

export type StatementsData = {
  me: { currency: string; today: string };
  aiReady: boolean;
  statements: Array<{ id: string; name: string }>;
  selected: string | null;
  txns: Array<{ id: string; date: string; description: string; place: string; amount: number; category: string }>;
  tracked: string[];
};
