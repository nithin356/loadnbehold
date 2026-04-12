import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useAuthStore } from '@/lib/store';
import { customerApi } from '@/lib/api';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

async function sendTokenToServer(pushToken: string) {
  try {
    await customerApi.registerPushToken(pushToken);
  } catch {}
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    hydrate().finally(() => {
      SplashScreen.hideAsync();
    });
  }, []);

  // Register push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    registerForPushNotifications().then((pushToken) => {
      if (pushToken) sendTokenToServer(pushToken);
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // notification received in foreground — handler above shows alert
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
      // user tapped notification — could navigate based on data
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [isAuthenticated]);

  if (isLoading) return null;

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.loadnbehold">
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="index" />
      </Stack>
    </StripeProvider>
  );
}
