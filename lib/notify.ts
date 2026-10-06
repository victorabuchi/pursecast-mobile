import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as api from './api-client';

// Reminders show while the app is open too.
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

const FLAG = 'pursecast_push_on';
export type NotifyState = 'loading' | 'unsupported' | 'blocked' | 'off' | 'on';

const projectId = (): string | undefined => (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;

async function currentToken(): Promise<string | null> {
  try {
    const id = projectId();
    return (await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined)).data;
  } catch {
    return null;
  }
}

export async function notifyState(): Promise<NotifyState> {
  if (!Device.isDevice) return 'unsupported';
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'denied' && !canAskAgain) return 'blocked';
  if (status !== 'granted') return 'off';
  // On means this phone is registered; turning off removes it but leaves the
  // system permission, so that is remembered here.
  return (await SecureStore.getItemAsync(FLAG).catch(() => null)) === '1' ? 'on' : 'off';
}

// Asks for permission and registers this phone. Returns the new state.
export async function turnOnNotifications(): Promise<{ state: NotifyState; message?: string }> {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Reminders', importance: Notifications.AndroidImportance.DEFAULT });
  const asked = await Notifications.requestPermissionsAsync();
  if (!asked.granted) return { state: asked.canAskAgain ? 'off' : 'blocked' };
  const token = await currentToken();
  if (!token) return { state: 'off', message: 'This device could not be set up. Try again.' };
  try {
    await api.registerPush(token);
    await SecureStore.setItemAsync(FLAG, '1');
    return { state: 'on' };
  } catch (e) {
    return { state: 'off', message: e instanceof Error ? e.message : 'This device could not be set up. Try again.' };
  }
}

export async function turnOffNotifications(): Promise<void> {
  await SecureStore.deleteItemAsync(FLAG).catch(() => undefined);
  const token = await currentToken();
  if (token) await api.unregisterPush(token).catch(() => undefined);
}
