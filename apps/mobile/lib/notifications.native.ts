import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: any;
try {
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

// In Expo Go (SDK 53+), push notifications are not supported.
// Provide safe stubs so the app doesn't crash.
const noop = () => {};
const noopAsync = async () => ({ status: 'undetermined' as const });
const noopListener = (_cb: any): { remove: () => void } => ({ remove: noop });

export const setNotificationHandler = isExpoGo || !Notifications
  ? noop
  : Notifications.setNotificationHandler.bind(Notifications);

export const getPermissionsAsync = isExpoGo || !Notifications
  ? noopAsync
  : Notifications.getPermissionsAsync.bind(Notifications);

export const requestPermissionsAsync = isExpoGo || !Notifications
  ? noopAsync
  : Notifications.requestPermissionsAsync.bind(Notifications);

export const setNotificationChannelAsync = isExpoGo || !Notifications
  ? async () => {}
  : Notifications.setNotificationChannelAsync.bind(Notifications);

export const getExpoPushTokenAsync = isExpoGo || !Notifications
  ? async () => ({ data: '' })
  : Notifications.getExpoPushTokenAsync.bind(Notifications);

export const addNotificationReceivedListener = isExpoGo || !Notifications
  ? noopListener
  : Notifications.addNotificationReceivedListener.bind(Notifications);

export const addNotificationResponseReceivedListener = isExpoGo || !Notifications
  ? noopListener
  : Notifications.addNotificationResponseReceivedListener.bind(Notifications);

export const AndroidImportance = Notifications?.AndroidImportance ?? { MAX: 5 };
