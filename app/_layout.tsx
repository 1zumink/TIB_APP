import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { StoreProvider, useStore } from '@/store/StoreContext';
import { AuthScreen } from '@/components/AuthScreen';
import { TibLogo } from '@/components/TibLogo';
import { colors } from '@/theme';

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: 76,
          height: 76,
          borderRadius: 22,
          backgroundColor: colors.red,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <TibLogo size={38} color="#fff" />
      </View>
      <ActivityIndicator color={colors.textFaint} style={{ marginTop: 24 }} />
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { authReady, needsAuth } = useStore();
  if (!authReady) return <Splash />;
  if (needsAuth) return <AuthScreen />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StoreProvider>
          <StatusBar style="light" />
          <AuthGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.bg },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="schedule" options={{ presentation: 'card' }} />
              <Stack.Screen name="worklog" options={{ presentation: 'card' }} />
            </Stack>
          </AuthGate>
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
