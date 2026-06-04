import React from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '../src/store/authStore';
import { useChatNotifications } from '../src/hooks/useChatNotifications';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

function SplashGate({ children }: { children: React.ReactNode }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  React.useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isHydrated]);
  return <>{children}</>;
}

// App-wide chat presence: maintains the notification socket, plays a sound on
// new messages and keeps unread badges fresh. Renders nothing.
function ChatNotifications() {
  useChatNotifications();
  return null;
}

export default function Layout() {
  return (
    // SafeAreaProvider is required for `react-native-safe-area-context`
    // SafeAreaView/useSafeAreaInsets to return non-zero insets. Without it
    // every screen falls back to padding 0 on Android, which is why headers
    // were rendering right against the status bar.
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SplashGate>
          {Platform.OS === 'android' && (
            <StatusBar
              translucent={false}
              backgroundColor="#F8F5FF"
              barStyle="dark-content"
            />
          )}
          <ChatNotifications />
          <Stack screenOptions={{ headerShown: false }} />
        </SplashGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
