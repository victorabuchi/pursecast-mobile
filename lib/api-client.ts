import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';

const TOKEN_KEY = 'pursecast_session_token';

// The web app's own pages use Next.js server actions behind a cookie session.
// These calls target the parallel `/api/mobile/*` bearer-token surface in the
// web app, which runs those same actions and the same money load (see README).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export const webUrl = (path: string) => `${API_BASE_URL}${path}`;

export class ApiError extends Error {}
// The person has no balance yet: the first-time setup comes first.
export class SetupRequired extends ApiError {}
export class SignedOut extends ApiError {}

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: { method?: string; body?: unknown; form?: FormData } = {}): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      // A FormData body sets its own multipart Content-Type (with boundary).
      ...(options.form ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.form ?? (options.body ? JSON.stringify(options.body) : undefined),
  });

  const text = await response.text();
  let json: { error?: string; setup?: boolean; redirect?: { error?: string } } & Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // Not JSON: a server error page.
  }
  if (response.status === 401 && token) throw new SignedOut(json.error ?? 'Sign in first.');
  if (response.status === 409 && json.setup) throw new SetupRequired('Set up your balance first.');
  if (!response.ok) throw new ApiError(json.error ?? json.redirect?.error ?? (text || `Request failed with status ${response.status}`));
  return json as T;
}

async function signIn(path: string, body: Record<string, string>): Promise<void> {
  const { token } = await request<{ token: string }>(path, { method: 'POST', body });
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export const login = (email: string, password: string) => signIn('/api/mobile/login', { email: email.trim().toLowerCase(), password });

export const register = (name: string, email: string, password: string) => signIn('/api/mobile/signup', { name: name.trim(), email: email.trim().toLowerCase(), password });

export async function logout(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function isLoggedIn(): Promise<boolean> {
  return Boolean(await getToken());
}

export type Me = { id: string; name: string; email: string; currency: string; setUp: boolean };
export const getMe = () => request<Me>('/api/mobile/me');

// The shared money load the web pages use, as JSON. `days` is how far the
// forecast runs.
export const getMoney = <T>(days?: number) => request<T>(`/api/mobile/money${days ? `?days=${days}` : ''}`);

export type ActionResult<T = unknown> = { ok: true; result: T | null; redirect?: { path: string; toast?: string; error?: string; params: Record<string, string>; url: string } };

// Runs one of the web's server actions by name. `form` becomes the FormData
// the action reads; `args` is for the few that take plain arguments. Server
// actions answer with a redirect carrying a message, returned as `redirect`.
export function action<T = unknown>(name: string, payload: { form?: Record<string, unknown>; args?: unknown[] } = {}): Promise<ActionResult<T>> {
  return request<ActionResult<T>>(`/api/mobile/action/${name}`, { method: 'POST', body: payload });
}

// The same, with files (a profile picture): sent as multipart.
export function actionWithFiles<T = unknown>(name: string, form: FormData): Promise<ActionResult<T>> {
  return request<ActionResult<T>>(`/api/mobile/action/${name}`, { method: 'POST', form });
}

// Statements, screenshots and exports are read on the server.
export const uploadStatements = (form: FormData) => request<Record<string, unknown>>('/api/statements', { method: 'POST', form });

// One screen's data: the shared money load plus that page's extras.
export function getPage<T>(name: string, days?: number, query?: Record<string, string>) {
  const search = new URLSearchParams(query);
  if (days) search.set('days', String(days));
  const qs = search.toString();
  return request<T>(`/api/mobile/page/${name}${qs ? `?${qs}` : ''}`);
}

export const getShell = () => request<import('./types').Shell>('/api/mobile/shell');

// Turns this phone's notifications on or off: its Expo push token is kept on
// the server, which sends reminders to it.
export const registerPush = (token: string) => request<{ ok: true }>('/api/mobile/push', { method: 'POST', body: { token } });
export const unregisterPush = (token: string) => request<{ ok: true }>('/api/mobile/push', { method: 'DELETE', body: { token } });

export type SettingsData = { me: import('./types').MoneyMe; hasPassword: boolean; weeklyEmail: boolean; emailReady: boolean };
export const getSettings = () => request<SettingsData>('/api/mobile/settings');

// Everything Pursecast stores about the person, as the JSON text the web's
// "Export my data" downloads.
export async function exportData(): Promise<string> {
  const token = await getToken();
  const response = await fetch(`${API_BASE_URL}/settings/export`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!response.ok) throw new ApiError('Could not export your data. Try again.');
  return response.text();
}

export const getSetup = () => request<import('./types').SetupData>('/api/mobile/setup');

export const getBanks = () => request<import('./types').BanksData>('/api/mobile/banks');

export const getStatements = (statementId?: string | null) => request<import('./types').StatementsData>(`/api/mobile/statements${statementId ? `?s=${statementId}` : ''}`);

// Sign in with Google (and Apple on Android): the web's own flow, in the system
// sign-in browser. It ends at pursecast://auth with a short-lived code, which is
// swapped for the session token together with a secret only this app knows
// (PKCE), so another app that catches the address cannot use it.
const b64url = (s: string) => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function loginWithProvider(provider: 'google' | 'apple'): Promise<boolean> {
  const verifier = b64url(btoa(String.fromCharCode(...(await Crypto.getRandomBytesAsync(32)))));
  const challenge = b64url(await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 }));
  const result = await WebBrowser.openAuthSessionAsync(`${API_BASE_URL}/auth/${provider}?intent=mobile&challenge=${challenge}`, 'pursecast://auth');
  if (result.type !== 'success') return false;
  const params = new URLSearchParams(result.url.split('?')[1] ?? '');
  const error = params.get('error');
  if (error) throw new ApiError(error);
  const code = params.get('code');
  if (!code) throw new ApiError(`${provider === 'google' ? 'Google' : 'Apple'} sign-in did not finish. Try again.`);
  const { token } = await request<{ token: string }>('/api/mobile/exchange', { method: 'POST', body: { code, verifier } });
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return true;
}

// The iPhone's own Sign in with Apple sheet. Apple's signed identity token goes
// to the server, which checks it against Apple's keys; the nonce ties the token
// to this attempt. Apple gives the name only the first time.
export async function loginWithAppleNative(): Promise<boolean> {
  const nonce = b64url(btoa(String.fromCharCode(...(await Crypto.getRandomBytesAsync(24)))));
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL], nonce: hashed });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw new ApiError('Apple sign-in did not finish. Try again.');
  }
  if (!credential.identityToken) throw new ApiError('Apple sign-in did not finish. Try again.');
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  await signIn('/api/mobile/apple', { identityToken: credential.identityToken, nonce, name });
  return true;
}
