import React from 'react';
import Svg, { Path } from 'react-native-svg';

const D =
  'M398.552 346.749L243.453 275.271V808.559L594.287 0L824.658 106.187L799.496 164.176L641.976 91.569V389.383L843 482.04L842.926 918.685L578.806 796.942V194.33L238.338 979L180.283 952.24V246.153L0 163.054L25.1584 105.072L424.342 289.071L398.552 346.749ZM779.831 522.503V820.467L641.976 756.924V458.96L779.831 522.503Z';

export function TibLogo({ size = 40, color = '#000' }: { size?: number; color?: string }) {
  // native aspect ratio 843 x 979
  const w = size;
  const h = (size * 979) / 843;
  return (
    <Svg width={w} height={h} viewBox="0 0 843 979" fill="none">
      <Path fillRule="evenodd" clipRule="evenodd" d={D} fill={color} />
    </Svg>
  );
}
