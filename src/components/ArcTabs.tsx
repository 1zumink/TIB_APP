import React, { useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from './motion';
import { colors } from '../theme';

/** Height the rail occupies below the safe area — screens pad by this. */
export const ARC_HEIGHT = 84;

/** Radius of the wheel the labels ride on. Bigger = flatter arc. */
const RADIUS = 340;
/** Angle between neighbouring labels. */
const STEP_DEG = 26;
/** How many neighbours each side get a place on the wheel. */
const RANGE = 3;

/**
 * Sampled circle.
 *
 * `position` from the pager is an RN Animated node, and those only do linear
 * interpolation between stops — no sin/cos. So the circle is precomputed once
 * here at 0.1-page resolution and handed over as a polyline; at this density
 * the seams are far below a pixel, and everything stays on the native driver
 * instead of round-tripping through JS on every frame.
 */
const SAMPLES = (() => {
  const offset: number[] = [];
  const x: number[] = [];
  const y: number[] = [];
  const rotate: string[] = [];
  const opacity: number[] = [];
  for (let k = -RANGE * 10; k <= RANGE * 10; k++) {
    const s = k / 10; // pages between this label and the one on screen
    const theta = (-s * STEP_DEG * Math.PI) / 180;
    offset.push(s);
    x.push(RADIUS * Math.sin(theta));
    // Negative = up. The wheel's centre is above the screen, so the active
    // label sits at the bottom of the arc and neighbours climb away from it.
    y.push(-RADIUS * (1 - Math.cos(theta)));
    // Tangent to the circle, so a label never looks pasted onto the curve.
    rotate.push(`${s * STEP_DEG}deg`);
    const fade = Math.max(0, 1 - Math.abs(s) * 0.6);
    opacity.push(Math.pow(fade, 1.2));
  }
  return { offset, x, y, rotate, opacity };
})();

type ArcTabsProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
  position: RNAnimated.AnimatedInterpolation<number>;
  labels: Record<string, string>;
};

/**
 * Tab labels riding a wheel.
 *
 * Everything is driven by the pager's live position rather than the committed
 * index, so the wheel turns under the finger and settles exactly when the page
 * does — the label you are dragging toward is already arriving before you let go.
 */
export function ArcTabs({ state, navigation, position, labels }: ArcTabsProps) {
  const insets = useSafeAreaInsets();
  const [width, setWidth] = useState(0);

  // One tick per landing, whether you tapped a label or swiped to it.
  const lastIndex = useRef(state.index);
  useEffect(() => {
    if (lastIndex.current !== state.index) {
      lastIndex.current = state.index;
      haptics.select();
    }
  }, [state.index]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      pointerEvents="box-none"
      style={[styles.rail, { paddingTop: insets.top, height: insets.top + ARC_HEIGHT }]}
    >
      {state.routes.map((route, i) => {
        // Input is the pager position; each sample sits `s` pages away from it.
        const inputRange = SAMPLES.offset.map((s) => i + s);
        const anim = {
          opacity: position.interpolate({
            inputRange,
            outputRange: SAMPLES.opacity,
            extrapolate: 'clamp',
          }),
          transform: [
            {
              translateX: position.interpolate({
                inputRange,
                outputRange: SAMPLES.x,
                extrapolate: 'clamp',
              }),
            },
            {
              translateY: position.interpolate({
                inputRange,
                outputRange: SAMPLES.y,
                extrapolate: 'clamp',
              }),
            },
            {
              rotate: position.interpolate({
                inputRange,
                outputRange: SAMPLES.rotate,
                extrapolate: 'clamp',
              }),
            },
          ],
        };
        return (
          <View key={route.key} style={styles.slot} pointerEvents="box-none">
            {/* The transform lives on a view sized to the label, so the label
                turns about its own centre rather than the screen's. */}
            <RNAnimated.View style={anim}>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: state.index === i }}
                hitSlop={10}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (state.index !== i && !event.defaultPrevented) navigation.navigate(route.name);
                }}
              >
                <Text numberOfLines={1} style={[styles.label, width ? { maxWidth: width } : null]}>
                  {labels[route.name] ?? route.name}
                </Text>
              </Pressable>
            </RNAnimated.View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // Labels run off both sides of the wheel — cutting them at the screen edge
    // is what shows there is more of it to turn to.
    overflow: 'hidden',
    zIndex: 10,
  },
  slot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.text,
  },
});
