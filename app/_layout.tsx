import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { ease, fadeIn, timing } from '@/components/motion';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { StoreProvider, useStore } from '@/store/StoreContext';
import { AuthScreen } from '@/components/AuthScreen';
import { TibLogo } from '@/components/TibLogo';
import { colors } from '@/theme';

/**
 * The badge breathes while we restore the session. Slow (1.4s a cycle) and
 * shallow — it should read as "alive", not as a second loading spinner.
 */
function Splash() {
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(
      withSequence(timing(1, 700, ease.inOut), timing(0, 700, ease.inOut)),
      -1,
      false
    );
  }, [breath]);
  const badge = useAnimatedStyle(() => ({
    transform: [{ scale: 0.96 + breath.value * 0.06 }],
  }));
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            width: 76,
            height: 76,
            borderRadius: 22,
            backgroundColor: colors.red,
            alignItems: 'center',
            justifyContent: 'center',
          },
          badge,
        ]}
      >
        <TibLogo size={38} color="#fff" />
      </Animated.View>
      <ActivityIndicator color={colors.textFaint} style={{ marginTop: 24 }} />
    </View>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { authReady, needsAuth } = useStore();
  if (!authReady) return <Splash />;
  // Splash → app is a hard cut otherwise; one fade makes it a handover.
  if (needsAuth)
    return (
      <Animated.View style={{ flex: 1 }} entering={fadeIn}>
        <AuthScreen />
      </Animated.View>
    );
  return (
    <Animated.View style={{ flex: 1 }} entering={fadeIn}>
      {children}
    </Animated.View>
  );
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
                gestureEnabled: true,
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
