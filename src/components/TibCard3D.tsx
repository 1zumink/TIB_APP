import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, radius } from '../theme';
import { Laminate } from './Laminate';
import { T } from './ui';
import { TibLogo } from './TibLogo';
import { Member } from '../types';

const CARD_W = 300;
const CARD_H = 190;
const PERSPECTIVE = 1000;
/** One revolution. Slow enough to read the card while it turns, brisk enough
 *  that the laminate catches the light on a glance rather than a stare. */
const SPIN_MS = 14000;

/**
 * A physical-feeling TIB_ID card you spin with your finger.
 * Front + back faces use backfaceVisibility so only the facing side shows.
 * Placeholder art — swap freely once the real card design is ready.
 */
export function TibCard3D({ member }: { member: Member }) {
  const rotY = useSharedValue(0); // degrees, continuous
  const rotX = useSharedValue(0); // degrees, clamped tilt
  const start = useSharedValue(0);

  /*
   * The card lives inside a horizontal swipe pager, and the pager wins.
   *
   * ViewPager2 intercepts a horizontal drag at its own touch slop, before this
   * gesture can activate — so `activeOffsetX` alone isn't enough. It only looked
   * like the card spun one way: on the last tab the pager has nowhere to go in
   * that direction, so it declines the touch and the card gets it by default.
   *
   * The fix is to take the pager out of the running while a finger is on the
   * card, and hand it back the moment the finger leaves. Touching the card is
   * unambiguous intent — nobody starts a tab swipe from the middle of it.
   */
  const navigation = useNavigation();
  const swipeOn = useRef(true);
  const setPagerSwipe = useCallback(
    (enabled: boolean) => {
      if (swipeOn.current === enabled) return; // don't re-render the navigator for nothing
      swipeOn.current = enabled;
      navigation.setOptions({ swipeEnabled: enabled } as object);
    },
    [navigation],
  );
  // A gesture cancelled by an unmount (tab change, sign-out) must not leave the
  // pager switched off for the rest of the session.
  useEffect(() => () => setPagerSwipe(true), [setPagerSwipe]);

  /*
   * Idle rotation. It exists to show the laminate — a film only gives itself
   * away off-axis, so a card sitting dead flat would look like plain print.
   * Linear easing on purpose: this is constant motion, not something entering
   * or leaving, and any ease would read as the card hesitating each lap.
   */
  const spin = () => {
    'worklet';
    rotY.value = withRepeat(
      withTiming(rotY.value + 360, {
        duration: SPIN_MS,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      false,
    );
  };

  // Nothing turns while the screen is off-stage — the pager keeps neighbouring
  // tabs mounted, and an invisible card has no business burning frames.
  const focused = useIsFocused();
  useEffect(() => {
    if (focused) spin();
    else cancelAnimation(rotY);
  }, [focused]);

  const pan = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .onBegin(() => {
      runOnJS(setPagerSwipe)(false);
      // Hand the card over to the finger mid-turn, from exactly where it is.
      cancelAnimation(rotY);
      start.value = rotY.value;
    })
    .onUpdate((e) => {
      rotY.value = start.value + e.translationX * 0.6;
      // subtle vertical tilt for depth, clamped
      rotX.value = Math.max(-18, Math.min(18, -e.translationY * 0.15));
    })
    .onEnd((e) => {
      // The fling plays out, then the idle turn picks up from wherever it left.
      rotY.value = withDecay({ velocity: e.velocityX * 0.5, deceleration: 0.997 }, (finished) => {
        if (finished) spin();
      });
      rotX.value = withSpring(0, { damping: 12, stiffness: 90 });
    })
    // Fires for every ending, including cancellations — the only safe place to
    // give the pager back.
    .onFinalize(() => {
      runOnJS(setPagerSwipe)(true);
    });

  /**
   * How far off-axis the face is: 0 flat on, 1 edge-on. `shift` keeps the sign,
   * so the highlight travels the way the card is actually turning.
   */
  const tilt = useDerivedValue(() => Math.abs(Math.sin((rotY.value * Math.PI) / 180)));
  /** How wide the card reads from here — 1 face on, 0 edge on. */
  const facing = useDerivedValue(() => Math.abs(Math.cos((rotY.value * Math.PI) / 180)));
  const shift = useDerivedValue(() => Math.sin((rotY.value * Math.PI) / 180));
  // The back face sits 180° round, so its light comes from the other side.
  const backShift = useDerivedValue(() => -shift.value);

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

  // A shadow is cast by the card's silhouette, so it narrows as the card turns
  // away. Leaving it a fixed ellipse is what makes 3D cards read as a flat
  // image with a sticker under it.
  const puckStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 0.4 + facing.value * 0.6 }],
    opacity: 0.3 + facing.value * 0.3,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.stage}>
        {/* soft shadow puck */}
        <Animated.View style={[styles.shadowPuck, puckStyle]} />

        {/* FRONT */}
        <Animated.View style={[styles.face, styles.front, frontStyle]}>
          <View style={styles.faceInner}>
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
          </View>

          {/* Film goes over the print, the way a real one is applied */}
          <Laminate
            id="front"
            tint="onRed"
            width={CARD_W}
            height={CARD_H}
            radius={radius.lg}
            tilt={tilt}
            shift={shift}
          />
        </Animated.View>

        {/* BACK */}
        <Animated.View style={[styles.face, styles.back, backStyle]}>
          <View style={styles.faceInner}>
            <View style={styles.magstripe} />
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
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
          </View>

          <Laminate
            id="back"
            tint="onPaper"
            width={CARD_W}
            height={CARD_H}
            radius={radius.lg}
            tilt={tilt}
            shift={backShift}
          />
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
  },
  face: {
    position: 'absolute',
    width: CARD_W,
    height: CARD_H,
    borderRadius: radius.lg,
    backfaceVisibility: 'hidden',
  },
  // Padding lives here, not on the face: an absolutely positioned film must
  // cover the whole card, and `overflow: hidden` on a 3D-transformed view is
  // unreliable on Android — the film clips itself instead.
  faceInner: { flex: 1, padding: 20 },
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
