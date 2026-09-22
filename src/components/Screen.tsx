import React from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, space } from '../theme';
import { ARC_HEIGHT } from './ArcTabs';

/*
 * No focus entrance here on purpose. Tab screens now live in a swipe pager:
 * the page already travels sideways under your finger, and a fade + rise on
 * arrival would be a second animation describing the same event — visible as
 * a flicker right as the swipe settles. The pager owns the transition.
 */

/** Standard scrollable screen: clears the arc rail on top, safe area below. */
export function Screen({
  children,
  scroll = true,
  contentStyle,
  fab,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Rendered outside the scroll area, so it stays put while the page moves. */
  fab?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  // Content starts below the label wheel, which floats over every page.
  const paddingTop = insets.top + ARC_HEIGHT + space.sm;
  // Room for the button, so the last row is never parked underneath it.
  const paddingBottom = (fab ? 104 : space.xl) + insets.bottom;

  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[{ flex: 1, paddingTop, paddingHorizontal: space.xl }, contentStyle]}>
          {children}
        </View>
        {fab}
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
      {fab}
    </View>
  );
}
