import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';

/** TIB mark, native box 843 × 979. Same path the logo component draws. */
const LOGO =
  'M398.552 346.749L243.453 275.271V808.559L594.287 0L824.658 106.187L799.496 164.176L641.976 91.569V389.383L843 482.04L842.926 918.685L578.806 796.942V194.33L238.338 979L180.283 952.24V246.153L0 163.054L25.1584 105.072L424.342 289.071L398.552 346.749ZM779.831 522.503V820.467L641.976 756.924V458.96L779.831 522.503Z';

const TILE = 34; // one staggered pair per tile
const GLYPH = 12; // mark width inside the tile

const clamp01 = (v: number) => {
  'worklet';
  return Math.max(0, Math.min(1, v));
};

type Tint = 'onRed' | 'onPaper';

const TINTS: Record<Tint, { tile: string; sheen: string[]; spec: string }> = {
  // On the red face the foil reads as bright white embossing.
  onRed: {
    tile: 'rgba(255,255,255,0.7)',
    sheen: ['rgba(255,140,205,0.55)', 'rgba(130,255,225,0.45)', 'rgba(255,238,150,0.5)', 'rgba(160,185,255,0.45)'],
    spec: 'rgba(255,255,255,0.55)',
  },
  // On the paper face it reads as the warm gold you get on a real laminate.
  onPaper: {
    tile: 'rgba(190,165,80,0.55)',
    sheen: ['rgba(255,150,205,0.5)', 'rgba(120,230,205,0.45)', 'rgba(240,215,120,0.5)', 'rgba(150,175,255,0.4)'],
    spec: 'rgba(255,255,255,0.75)',
  },
};

/**
 * The laminate film over a card face.
 *
 * A real laminate is invisible head-on and only gives itself away off-axis:
 * the foil pattern catches the light, and the diffraction layer throws colour.
 * So everything here is driven by the card's angle rather than played on a
 * timer — `tilt` (0 head-on → 1 edge-on) fades the layers in, and `shift`
 * (−1…1, signed) slides them across, which is what sells it as light moving
 * over a surface instead of a texture pasted on top.
 */
export function Laminate({
  width,
  height,
  radius,
  tilt,
  shift,
  tint,
  id,
}: {
  width: number;
  height: number;
  radius: number;
  tilt: SharedValue<number>;
  shift: SharedValue<number>;
  tint: Tint;
  id: string;
}) {
  const c = TINTS[tint];
  // Twice the face width so there is something to slide into view.
  const sweepW = width * 2;

  const tiles = useAnimatedStyle(() => ({
    // Never fully zero: a laminate head-on still has the faintest grain.
    opacity: 0.05 + clamp01(tilt.value) * 0.8,
  }));

  const sheen = useAnimatedStyle(() => ({
    opacity: clamp01(tilt.value * 1.15),
    transform: [{ translateX: -width / 2 + shift.value * width * 0.55 }],
  }));

  const spec = useAnimatedStyle(() => ({
    // The specular streak needs a steeper curve — it should flash near the
    // angle, not glow across the whole turn.
    opacity: clamp01(tilt.value * tilt.value * 1.4),
    transform: [{ translateX: -width / 2 + shift.value * width * 0.9 }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      {/* Foil pattern — the TIB mark tiled in a staggered grid */}
      <Animated.View style={[StyleSheet.absoluteFill, tiles]}>
        <Svg width={width} height={height}>
          <Defs>
            <Pattern
              id={`tib-tiles-${id}`}
              x="0"
              y="0"
              width={TILE}
              height={TILE}
              patternUnits="userSpaceOnUse"
            >
              <Path
                d={LOGO}
                fill={c.tile}
                fillRule="evenodd"
                clipRule="evenodd"
                transform={`translate(1 1) scale(${GLYPH / 843})`}
              />
              <Path
                d={LOGO}
                fill={c.tile}
                fillRule="evenodd"
                clipRule="evenodd"
                transform={`translate(${TILE / 2} ${TILE / 2}) scale(${GLYPH / 843})`}
              />
            </Pattern>
          </Defs>
          <Rect x="0" y="0" width={width} height={height} fill={`url(#tib-tiles-${id})`} />
        </Svg>
      </Animated.View>

      {/* Diffraction — the pastel spread that gives holographic film its colour */}
      <Animated.View style={[StyleSheet.absoluteFill, sheen]}>
        <Svg width={sweepW} height={height}>
          <Defs>
            <LinearGradient id={`tib-sheen-${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={c.sheen[0]} stopOpacity="0" />
              <Stop offset="0.2" stopColor={c.sheen[0]} stopOpacity="1" />
              <Stop offset="0.4" stopColor={c.sheen[1]} stopOpacity="1" />
              <Stop offset="0.6" stopColor={c.sheen[2]} stopOpacity="1" />
              <Stop offset="0.8" stopColor={c.sheen[3]} stopOpacity="1" />
              <Stop offset="1" stopColor={c.sheen[3]} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={sweepW} height={height} fill={`url(#tib-sheen-${id})`} />
        </Svg>
      </Animated.View>

      {/* Specular — the narrow bright band that rakes across as it turns */}
      <Animated.View style={[StyleSheet.absoluteFill, spec]}>
        <Svg width={sweepW} height={height}>
          <Defs>
            <LinearGradient id={`tib-spec-${id}`} x1="0" y1="0.15" x2="1" y2="0.85">
              <Stop offset="0.38" stopColor={c.spec} stopOpacity="0" />
              <Stop offset="0.47" stopColor={c.spec} stopOpacity="1" />
              <Stop offset="0.53" stopColor={c.spec} stopOpacity="1" />
              <Stop offset="0.62" stopColor={c.spec} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width={sweepW} height={height} fill={`url(#tib-spec-${id})`} />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}
