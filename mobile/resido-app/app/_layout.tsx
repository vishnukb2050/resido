import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Platform } from 'react-native';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

export default function Layout() {
  return (
    // SafeAreaProvider is required for `react-native-safe-area-context`
    // SafeAreaView/useSafeAreaInsets to return non-zero insets. Without it
    // every screen falls back to padding 0 on Android, which is why headers
    // were rendering right against the status bar.
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        {Platform.OS === 'android' && (
          <StatusBar
            translucent={false}
            backgroundColor="#F8F5FF"
            barStyle="dark-content"
          />
        )}
        <Stack screenOptions={{ headerShown: false }} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
