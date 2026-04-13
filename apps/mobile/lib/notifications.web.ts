// Stubs for web — expo-notifications is native-only
export const setNotificationHandler = () => {};
export const getPermissionsAsync = async () => ({ status: 'undetermined' });
export const requestPermissionsAsync = async () => ({ status: 'undetermined' });
export const setNotificationChannelAsync = async () => {};
export const getExpoPushTokenAsync = async () => ({ data: '' });
export const addNotificationReceivedListener = (_cb: any): { remove: () => void } => ({ remove: () => {} });
export const addNotificationResponseReceivedListener = (_cb: any): { remove: () => void } => ({ remove: () => {} });
export const AndroidImportance = { MAX: 5 };
