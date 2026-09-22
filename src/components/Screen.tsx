import React from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme';

/*
 * No focus entrance here on purpose. Tab screens now live in a swipe pager:
 * the page already travels sideways under your finger, and a fade + rise on
 * arrival would be a second animation describing the same event — visible as
 * a flicker right as the swipe settles. The pager owns the transition.
 */

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
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[{ flex: 1, paddingTop, paddingHorizontal: space.xl }, contentStyle]}>{children}</View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[{ paddingTop, paddingBottom, paddingHorizontal: space.xl }, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}
