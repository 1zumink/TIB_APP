import React, { useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { TopTabs } from 'expo-router/js-top-tabs';
import { Ionicons } from '@expo/vector-icons';
import { haptics } from '@/components/motion';
import { colors } from '@/theme';

const PILL = 46;

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  deadlines: 'flame',
  tasks: 'checkbox',
  events: 'sparkles',
  profile: 'person',
};

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
  /** Continuous pager offset, 0…n-1 — follows the finger, not the committed index. */
  position: RNAnimated.AnimatedInterpolation<number>;
};

/**
 * Floating pill tab bar.
 *
 * The highlight is driven by the pager's own position rather than by the
 * committed index, so it tracks the swipe in real time and lands exactly when
 * the page does. Tying it to `state.index` instead would make it jump after
 * the fact — the one thing that gives away a fake pager.
 */
function FloatingTabBar({ state, navigation, position }: TabBarProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const count = state.routes.length;
  const itemWidth = rowWidth / Math.max(1, count);
  const inputRange = state.routes.map((_, i) => i);

  // One tick per landing, whether you tapped or swiped there.
  const lastIndex = useRef(state.index);
  useEffect(() => {
    if (lastIndex.current !== state.index) {
      lastIndex.current = state.index;
      haptics.select();
    }
  }, [state.index]);

  const onLayout = (e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.bar} pointerEvents="box-none">
      {/* Measure the inner row, not the bar: the pill is positioned against
          this box, so any padding on the bar would offset it by half a tab. */}
      <View style={styles.row} onLayout={onLayout}>
      {rowWidth > 0 && count > 1 ? (
        <RNAnimated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              left: (itemWidth - PILL) / 2,
              transform: [
                {
                  translateX: position.interpolate({
                    inputRange,
                    outputRange: inputRange.map((i) => i * itemWidth),
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      {state.routes.map((route, i) => {
        const icon = ICONS[route.name] ?? 'ellipse';
        // 1 when this tab is dead centre, 0 by the time its neighbour is.
        const here = position.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: [0, 1, 0],
          extrapolate: 'clamp',
        });
        return (
          <Pressable
            key={route.key}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: state.index === i }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (state.index !== i && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <RNAnimated.View
              style={[
                styles.iconWrap,
                {
                  transform: [
                    { translateY: here.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) },
                    { scale: here.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
                  ],
                },
              ]}
            >
              {/* The two states are stacked and cross-faded, so the colour
                  travels with the swipe instead of flipping at the halfway mark. */}
              <Ionicons name={icon} size={22} color={colors.textFaint} />
              <RNAnimated.View style={[styles.iconOverlay, { opacity: here }]}>
                <Ionicons name={icon} size={22} color={colors.white} />
              </RNAnimated.View>
            </RNAnimated.View>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <TopTabs
      tabBarPosition="bottom"
      tabBar={(props: TabBarProps) => <FloatingTabBar {...props} />}
      screenOptions={{
        // Neighbours are rendered ahead of time — a swipe must never reveal a
        // blank page — but the far tabs stay unmounted until you reach them.
        lazy: true,
        lazyPreloadDistance: 1,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <TopTabs.Screen name="index" />
      <TopTabs.Screen name="deadlines" />
      <TopTabs.Screen name="tasks" />
      <TopTabs.Screen name="events" />
      <TopTabs.Screen name="profile" />
    </TopTabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 24 : 16,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.stroke,
    paddingHorizontal: 8,
    alignItems: 'center',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  pill: {
    position: 'absolute',
    width: PILL,
    height: PILL,
    borderRadius: PILL / 2,
    backgroundColor: colors.red,
  },
  item: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: PILL,
    height: PILL,
    borderRadius: PILL / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
