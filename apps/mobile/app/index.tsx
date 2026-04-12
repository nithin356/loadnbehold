import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/store';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user?.role === 'driver') {
    return <Redirect href="/(driver)/dashboard" />;
  }

  return <Redirect href="/(customer)/home" />;
}
