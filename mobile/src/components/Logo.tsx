import React from 'react';
import Svg, { Polygon, Rect, Line } from 'react-native-svg';
import { colors } from '../theme/theme';

export interface LogoProps {
  /** Width & height of the SVG viewport (square) */
  size?: number;
}

/**
 * PadosiPro Logo — an original abstract geometric mark.
 *
 * Concept: Two overlapping house/home shapes arranged as connected neighbors,
 * representing the "connected neighborhood" idea. The left and right rooftop
 * triangles share a wall, forming a subtle "P" negative space.
 *
 * Rendered entirely with react-native-svg for crisp scaling at any size.
 */
export default function Logo({ size = 48 }: LogoProps) {
  // All coordinates are designed for a 48×48 viewBox and scale via the size prop.
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
    >
      {/* Left house roof — triangle */}
      <Polygon
        points="6,28 18,12 24,20"
        fill={colors.primaryDark}
      />

      {/* Right house roof — triangle (overlaps slightly, creating depth) */}
      <Polygon
        points="24,20 30,12 42,28"
        fill={colors.primary}
      />

      {/* Left house body */}
      <Rect
        x={9}
        y={28}
        width={12}
        height={12}
        rx={2}
        fill={colors.primaryDark}
      />

      {/* Right house body */}
      <Rect
        x={27}
        y={28}
        width={12}
        height={12}
        rx={2}
        fill={colors.primary}
      />

      {/* Connecting bridge between the two houses */}
      <Rect
        x={21}
        y={30}
        width={6}
        height={4}
        rx={1}
        fill={colors.primary}
        opacity={0.7}
      />

      {/* Left door */}
      <Rect
        x={13}
        y={33}
        width={4}
        height={7}
        rx={1}
        fill={colors.background}
        opacity={0.85}
      />

      {/* Right door */}
      <Rect
        x={31}
        y={33}
        width={4}
        height={7}
        rx={1}
        fill={colors.background}
        opacity={0.85}
      />

      {/* Subtle signal/connection lines above (like WiFi/connectivity) */}
      <Line
        x1={24}
        y1={6}
        x2={24}
        y2={9}
        stroke={colors.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
        opacity={0.6}
      />
      <Line
        x1={21}
        y1={5}
        x2={21}
        y2={7}
        stroke={colors.primary}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.4}
      />
      <Line
        x1={27}
        y1={5}
        x2={27}
        y2={7}
        stroke={colors.primary}
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.4}
      />
    </Svg>
  );
}
