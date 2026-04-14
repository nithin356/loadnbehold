import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from '@/lib/notifications';
import * as Device from '@/lib/device';
import { StripeProvider } from '@/lib/stripe';
import { useAuthStore } from '@/lib/store';
import { customerApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from 'sonner-native';
import { router } from 'expo-router';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
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
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

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

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.orderId) {
        const role = useAuthStore.getState().user?.role;
        if (role === 'driver') {
          router.push(`/(driver)/order/${data.orderId}`);
        } else {
          router.push({ pathname: '/(customer)/track', params: { orderId: data.orderId as string } });
        }
      } else if (data?.screen) {
        router.push(data.screen as any);
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, [isAuthenticated]);

  if (isLoading) return null;

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY} merchantIdentifier="merchant.com.loadnbehold">
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="(driver)" />
            <Stack.Screen name="index" />
          </Stack>
          <Toaster position="top-center" />
        </StripeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
