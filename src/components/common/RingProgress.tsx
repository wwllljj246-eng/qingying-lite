import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { semantic } from '@/theme/colors';

export interface RingProgressProps {
  /** 0 ~ 1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

/**
 * 柔和圆环进度（无复杂渐变，单一描边色）
 */
export function RingProgress({
  progress,
  size = 120,
  strokeWidth = 12,
  color = semantic.primary,
  trackColor = semantic.border,
  children,
}: RingProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dash = circumference * clamped;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      {children ? <View style={{ alignItems: 'center' }}>{children}</View> : null}
    </View>
  );
}

export default RingProgress;
