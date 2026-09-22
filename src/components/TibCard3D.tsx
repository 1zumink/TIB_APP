import React, { useCallback, useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { SvgXml } from 'react-native-svg';
import {
  ART_BARCODE,
  BARCODE_FLIP,
  SIGNATURE_ART,
  SIGNATURE_BACK_OPACITY,
  SIGNATURE_FRONT_OPACITY,
  SIGNATURE_PLACEMENT,
  type ArtPlacement,
} from './cardArt';
import { Laminate } from './Laminate';
import { TibLogo } from './TibLogo';
import { fonts } from '../theme';
import { Member } from '../types';

/**
 * The card is laid out in Figma's coordinates (900 × 570) and scaled to
 * whatever width the screen gives us, so every number below can be read
 * straight off the design instead of being pre-divided by hand.
 */
const DESIGN_W = 900;
const DESIGN_H = 570;
const MAX_CARD_W = 344;

const PERSPECTIVE = 1000;
/** One revolution. Slow enough to read the card while it turns. */
const SPIN_MS = 14000;

const RED = '#FF0042';
const PAPER = '#FFFFFF';

/*
 * The bundled portrait already has the design's white `overlay` blend baked in
 * — React Native has no blend modes, and a flat translucent layer cannot
 * reproduce one (overlay doubles the darks and clips the lights). Matching the
 * design pixel for pixel means the transform lives in the file:
 *   v' = v > 127 ? 255 : v * 2   (per channel)
 * Re-apply that if this photo is ever replaced. A photoUrl from the profile is
 * shown untouched, since we cannot process a remote file.
 */
const PORTRAIT = require('../../assets/card/portrait.jpg');

export function TibCard3D({
  member,
  width,
  preview = false,
}: {
  member: Member;
  /** Fixed width instead of the responsive fit — used to check the print 1:1. */
  width?: number;
  /** Print only: no spin, no film, no gesture. For comparing against the design. */
  preview?: boolean;
}) {
  const { width: windowW } = useWindowDimensions();
  const cardW = width ?? Math.min(MAX_CARD_W, windowW - 48);
  const s = cardW / DESIGN_W;
  const cardH = DESIGN_H * s;
  /** Figma pixels → screen points. */
  const px = useCallback((n: number) => n * s, [s]);

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
    [navigation]
  );
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
      false
    );
  };

  // Nothing turns while the screen is off-stage — the pager keeps neighbouring
  // tabs mounted, and an invisible card has no business burning frames.
  const focused = useIsFocused();
  useEffect(() => {
    if (preview) return;
    if (focused) spin();
    else cancelAnimation(rotY);
  }, [focused, preview]);

  const pan = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .onBegin(() => {
      runOnJS(setPagerSwipe)(false);
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
    .onFinalize(() => {
      runOnJS(setPagerSwipe)(true);
    });

  /**
   * How far off-axis the face is: 0 flat on, 1 edge-on. `shift` keeps the sign,
   * so the highlight travels the way the card is actually turning.
   */
  const tilt = useDerivedValue(() => Math.abs(Math.sin((rotY.value * Math.PI) / 180)));
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

  const face = { width: cardW, height: cardH, borderRadius: px(24) };
  const cardNo = `NO.${member.code}`;
  const signature = member.signature ?? 'ilya';
  const art = SIGNATURE_ART[signature] ?? SIGNATURE_ART.ilya;
  const placement = SIGNATURE_PLACEMENT[signature] ?? SIGNATURE_PLACEMENT.ilya;

  return (
    <GestureDetector gesture={pan}>
      <View style={[styles.stage, { width: cardW, height: cardH }]}>
        {/* FRONT */}
        <Animated.View style={[styles.face, face, { backgroundColor: RED }, frontStyle]}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: px(24), overflow: 'hidden' }]}>
            <Signature
              xml={art.front}
              placement={placement}
              px={px}
              opacity={SIGNATURE_FRONT_OPACITY}
            />

            <Micro px={px} color="#fff" left={40} top={30}>
              TIB IDENTIFICATION CARD
            </Micro>
            <Micro px={px} color="#fff" left={40} top={49}>
              {cardNo}
            </Micro>

            <Portrait px={px} uri={member.photoUrl} />

            <View style={{ position: 'absolute', left: px(40), top: px(416) }}>
              <SvgXml xml={ART_BARCODE} width={px(262)} height={px(124.47)} style={BARCODE_FLIP} />
            </View>

            <View style={{ position: 'absolute', left: px(800.56), top: px(73) }}>
              <TibLogo size={px(59.41)} color="#fff" />
            </View>

            <Field px={px} top={73} label="first name:" value={member.firstName} />
            <Field px={px} top={170} label="last name:" value={member.lastName} />
            {/* The design sets two separate lines, not one wrapping string. */}
            <Field
              px={px}
              top={267}
              label="position:"
              value={member.role}
              value2={member.roleSecondary}
            />
            <Field px={px} top={415} label="number:" value={member.phone} />

            <Micro px={px} color="#fff" left={376} top={502}>
              THE MANUFACTURE OF THIS CARD IS PROHIBITED
            </Micro>
            <Micro px={px} color="#fff" left={701} top={502}>
              DATE OF EXPIRE: TILL I DIE
            </Micro>
            <Micro px={px} color="#fff" left={376} top={526}>
              DATE OF ISSUE: NEVERMIND
            </Micro>
            <Micro px={px} color="#fff" left={617} top={526}>
              THE HOLDER OF THIS CARD IS A LEGEND
            </Micro>
          </View>

          {/* Film goes over the print, the way a real one is applied */}
          {preview ? null : <Laminate
            id="front"
            tint="onRed"
            width={cardW}
            height={cardH}
            radius={px(24)}
            tilt={tilt}
            shift={shift}
          />}
        </Animated.View>

        {/* BACK */}
        <Animated.View style={[styles.face, face, { backgroundColor: PAPER }, backStyle]}>
          <View style={[StyleSheet.absoluteFill, { borderRadius: px(24), overflow: 'hidden' }]}>
            <Signature
              xml={art.back}
              placement={placement}
              px={px}
              opacity={SIGNATURE_BACK_OPACITY}
            />

            <Micro px={px} color="#000" left={40} top={30}>
              TIB IDENTIFICATION CARD
            </Micro>
            <Micro px={px} color="#000" left={40} top={49}>
              {cardNo}
            </Micro>

            <View style={{ position: 'absolute', left: px(816), top: px(30) }}>
              <TibLogo size={px(44)} color="#000" />
            </View>

            <Micro px={px} color="#000" left={40} top={526} uppercase>
              {member.website}
            </Micro>
            {/* Both of these are flush to the same right margin as the design */}
            <Micro px={px} color="#000" right={40} top={507} uppercase>
              {member.handle}
            </Micro>
            <Micro px={px} color="#000" right={40} top={526} uppercase>
              {member.phone}
            </Micro>
          </View>

          {preview ? null : <Laminate
            id="back"
            tint="onPaper"
            width={cardW}
            height={cardH}
            radius={px(24)}
            tilt={tilt}
            shift={backShift}
          />}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

type Px = (n: number) => number;

/**
 * A signature mark.
 *
 * Figma reserves a box for it — usually larger than the card, since these run
 * off the edges — and centres the vector inside, turned. The vector itself is
 * exported untransformed, so the rotation and mirror are re-applied here; skip
 * them and every mark lands upside down.
 */
function Signature({
  xml,
  placement,
  px,
  opacity,
}: {
  xml: string;
  placement: ArtPlacement;
  px: Px;
  opacity: number;
}) {
  const { box, art, rotate, flipX } = placement;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: px(box.left),
        top: px(box.top),
        width: px(box.width),
        height: px(box.height),
        alignItems: 'center',
        justifyContent: 'center',
        opacity,
      }}
    >
      <View style={{ transform: [{ rotate: `${rotate}deg` }, { scaleX: flipX ? -1 : 1 }] }}>
        <SvgXml xml={xml} width={px(art.width)} height={px(art.height)} />
      </View>
    </View>
  );
}

function Portrait({ px, uri }: { px: Px; uri?: string }) {
  const w = px(262);
  const h = px(333);
  return (
    <View
      style={{
        position: 'absolute',
        left: px(40),
        top: px(73),
        width: w,
        height: h,
        // Clip, always: a portrait that fails to size would otherwise paint
        // over the whole card at its natural resolution.
        overflow: 'hidden',
      }}
    >
      {/*
        Explicit width/height, not absolute inset-0. An Image whose style does
        not state a size falls back to the asset's own dimensions — on web it
        lays out at the file's full 960 × 1280 and spills across the card.
      */}
      <Image source={uri ? { uri } : PORTRAIT} style={{ width: w, height: h }} resizeMode="cover" />
    </View>
  );
}

/** A labelled value: small caption, then the value in 40px bold caps. */
function Field({
  px,
  top,
  label,
  value,
  value2,
}: {
  px: Px;
  top: number;
  label: string;
  value: string;
  /** Second line, placed at the design's own offset rather than by wrapping. */
  value2?: string;
}) {
  const valueStyle = {
    position: 'absolute' as const,
    left: px(376),
    width: px(484),
    fontFamily: fonts.black,
    fontSize: px(40),
    lineHeight: px(46),
    fontWeight: '700' as const,
    color: '#fff',
    textTransform: 'uppercase' as const,
  };
  return (
    <>
      <Text
        style={{
          position: 'absolute',
          left: px(376),
          top: px(top),
          fontFamily: fonts.body,
          fontSize: px(16),
          lineHeight: px(18),
          color: '#fff',
        }}
      >
        {label}
      </Text>
      <Text numberOfLines={1} style={[valueStyle, { top: px(top + 23) }]}>
        {value}
      </Text>
      {value2 ? (
        <Text numberOfLines={1} style={[valueStyle, { top: px(top + 74) }]}>
          {value2}
        </Text>
      ) : null}
    </>
  );
}

/** The 12px print: legend lines, card number, contacts. */
function Micro({
  px,
  left,
  right,
  top,
  color,
  uppercase,
  children,
}: {
  px: Px;
  left?: number;
  right?: number;
  top: number;
  color: string;
  uppercase?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Text
      numberOfLines={1}
      style={{
        position: 'absolute',
        left: left === undefined ? undefined : px(left),
        right: right === undefined ? undefined : px(right),
        top: px(top),
        fontFamily: fonts.body,
        fontSize: px(12),
        lineHeight: px(14),
        color,
        textTransform: uppercase ? 'uppercase' : 'none',
      }}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  face: { position: 'absolute', backfaceVisibility: 'hidden' },
});
