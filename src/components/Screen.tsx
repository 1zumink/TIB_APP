import React from 'react';
import { RefreshControl, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme';

/** Standard scrollable screen with safe-area top + room for the floating tab bar. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
  tabBarSpace = true,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  tabBarSpace?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const paddingTop = insets.top + space.sm;
  const paddingBottom = (tabBarSpace ? 96 : space.lg) + insets.bottom;

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: colors.bg, paddingTop, paddingHorizontal: space.xl }, contentStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ paddingTop, paddingBottom, paddingHorizontal: space.xl }, contentStyle]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
