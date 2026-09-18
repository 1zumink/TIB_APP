import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated';
import { colors, radius } from '../theme';
import { T } from './ui';
import { TibLogo } from './TibLogo';
import { Member } from '../types';

const CARD_W = 300;
const CARD_H = 190;
const PERSPECTIVE = 1000;

/**
 * A physical-feeling TIB_ID card you spin with your finger.
 * Front + back faces use backfaceVisibility so only the facing side shows.
 * Placeholder art — swap freely once the real card design is ready.
 */
export function TibCard3D({ member }: { member: Member }) {
  const rotY = useSharedValue(0); // degrees, continuous
  const rotX = useSharedValue(0); // degrees, clamped tilt
  const start = useSharedValue(0);

  const pan = Gesture.Pan()
    .onBegin(() => {
      start.value = rotY.value;
    })
    .onUpdate((e) => {
      rotY.value = start.value + e.translationX * 0.6;
      // subtle vertical tilt for depth, clamped
      rotX.value = Math.max(-18, Math.min(18, -e.translationY * 0.15));
    })
    .onEnd((e) => {
      rotY.value = withDecay({ velocity: e.velocityX * 0.5, deceleration: 0.997 });
      rotX.value = withSpring(0, { damping: 12, stiffness: 90 });
    });

  const frontStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${rotX.value}deg` },
      { rotateY: `${rotY.value}deg` },
    ],
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: PERSPECTIVE },
      { rotateX: `${rotX.value}deg` },
      { rotateY: `${rotY.value + 180}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.stage}>
        {/* soft shadow puck */}
        <View style={styles.shadowPuck} />

        {/* FRONT */}
        <Animated.View style={[styles.face, styles.front, frontStyle]}>
          <View style={styles.rowBetween}>
            <T variant="label" color="rgba(255,255,255,0.6)">
              TIB_ID
            </T>
            <TibLogo size={22} color="#fff" />
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            <T variant="h1" color="#fff" style={{ fontSize: 34, letterSpacing: -1.2 }}>
              {member.name}
            </T>
            <T variant="body" color="rgba(255,255,255,0.7)">
              {member.role}
            </T>
          </View>

          <View style={styles.rowBetween}>
            <T variant="title" color="#fff" style={{ letterSpacing: 2 }}>
              {member.code}
            </T>
            <View style={[styles.chipDot, { backgroundColor: member.color }]} />
          </View>
        </Animated.View>

        {/* BACK */}
        <Animated.View style={[styles.face, styles.back, backStyle]}>
          <View style={styles.magstripe} />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <TibLogo size={64} color="#000" />
          </View>
          <View style={styles.rowBetween}>
            <T variant="label" color="rgba(0,0,0,0.5)">
              This is beyond
            </T>
            <T variant="label" color="rgba(0,0,0,0.5)">
              {member.code}
            </T>
          </View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: CARD_W,
    height: CARD_H + 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  shadowPuck: {
    position: 'absolute',
    bottom: 6,
    width: CARD_W * 0.7,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(255,0,68,0.35)',
    opacity: 0.5,
  },
  face: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.lg,
    padding: 20,
    backfaceVisibility: 'hidden',
  },
  front: {
    backgroundColor: colors.red,
  },
  back: {
    backgroundColor: colors.paper,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  magstripe: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
    height: 40,
    backgroundColor: '#000',
  },
});
