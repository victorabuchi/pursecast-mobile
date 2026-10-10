import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as fx from './fixtures';

// Renders every screen with realistic data, the way the phone does, so a
// screen that throws while drawing fails here instead of closing the app.

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({ navigate: jest.fn(), replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void) => React.useEffect(cb, []),
    usePathname: () => '/',
    Redirect: () => null,
    Link: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Native audio has no test double; the screens only need these names.
jest.mock('expo-audio', () => ({
  RecordingPresets: { LOW_QUALITY: { extension: '.m4a', sampleRate: 22050, numberOfChannels: 1, bitRate: 32000 } },
  requestRecordingPermissionsAsync: async () => ({ granted: true }),
  setAudioModeAsync: async () => undefined,
  useAudioPlayer: () => ({ play: jest.fn(), pause: jest.fn(), seekTo: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false, currentTime: 0, duration: 0 }),
  useAudioRecorder: () => ({ prepareToRecordAsync: jest.fn(), record: jest.fn(), stop: jest.fn(), uri: null }),
}));

const mockPages: Record<string, unknown> = {};
jest.mock('../lib/api-client', () => {
  const actual = jest.requireActual('../lib/api-client');
  return {
    ...actual,
    isLoggedIn: async () => true,
    getMe: async () => ({ id: 'u1', name: 'Victor', email: 'v@x.com', currency: 'EUR', setUp: true }),
    getShell: async () => mockPages['shell'],
    getPage: async (name: string) => mockPages[name],
    getSetup: async () => mockPages['setup'],
    getBanks: async () => mockPages['banks'],
    getStatements: async () => mockPages['statements'],
    getSettings: async () => mockPages['settings'],
    action: async () => ({ ok: true, result: null }),
  };
});

import { AuthProvider } from '../lib/auth-context';
import { ShellProvider } from '../lib/shell-context';
import { ThemeProvider } from '../lib/theme-context';
import { ToastProvider } from '../components/ui';

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const wrap = (ui: React.ReactElement) => (
  <SafeAreaProvider initialMetrics={metrics}>
    <ThemeProvider>
      <AuthProvider>
        <ShellProvider>
          <ToastProvider>{ui}</ToastProvider>
        </ShellProvider>
      </AuthProvider>
    </ThemeProvider>
  </SafeAreaProvider>
);

// The phone's JavaScript engine (Hermes) has no formatToParts: take it away here
// too, so a screen that needs it fails in the tests and not on the phone.
beforeAll(() => {
  delete (Intl.NumberFormat.prototype as { formatToParts?: unknown }).formatToParts;
  delete (Intl.DateTimeFormat.prototype as { formatToParts?: unknown }).formatToParts;
});

beforeEach(() => {
  mockParams = {};
  Object.assign(mockPages, { forecast: fx.forecastData, spending: fx.spendingData, 'worth-it': fx.worthData, forks: fx.forksData, plan: fx.planData, setup: fx.setupEdit, banks: fx.banksData, statements: fx.statementsData, settings: fx.settingsData, shell: fx.shell });
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

async function show(Screen: React.ComponentType, text: string | RegExp) {
  render(wrap(<Screen />));
  await waitFor(() => expect(screen.getAllByText(text).length).toBeGreaterThan(0), { timeout: 4000 });
}

test('Forecast', async () => show(require('../app/(app)/forecast').default, 'Money Weather'));
test('Spending: activity', async () => show(require('../app/(app)/spending').default, /Spent in/));
test('Spending: bills', async () => { mockParams = { tab: 'bills' }; await show(require('../app/(app)/spending').default, /Comes in each month/); });
test('Spending: owed', async () => { mockParams = { tab: 'owed' }; await show(require('../app/(app)/spending').default, /People owe you/); });
test('Spending: budgets', async () => { mockParams = { tab: 'budgets' }; await show(require('../app/(app)/spending').default, /Everyday spending/); });
test('Worth-It', async () => show(require('../app/(app)/worth-it').default, 'Was it worth it?'));
test('Forks', async () => show(require('../app/(app)/forks').default, 'Timeline Forks'));
test('Plan ahead', async () => show(require('../app/(app)/plan').default, 'Plan ahead'));
test('Plan ahead: with an event open', async () => { mockParams = { event: 'ev1' }; await show(require('../app/(app)/plan').default, /Anna & Jon wedding/); });
test('Statements', async () => show(require('../app/(app)/statements').default, 'Where your money went'));
test('Banks', async () => show(require('../app/(app)/banks').default, 'Banks'));
test('Settings', async () => show(require('../app/(app)/settings').default, 'Settings'));
test('Setup (editing)', async () => show(require('../app/(app)/setup').default, 'Your setup'));
test('Setup (first run)', async () => { mockPages['setup'] = fx.setupFirst; await show(require('../app/(app)/setup').default, /let's draw your forecast/); });
test('Top bar', async () => {
  const TopBar = require('../components/TopBar').default;
  render(wrap(<TopBar />));
  await act(async () => {});
});
