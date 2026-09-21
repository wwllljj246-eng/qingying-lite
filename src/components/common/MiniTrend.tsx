import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { semantic } from '@/theme/colors';

export interface MiniTrendProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillColor?: string;
  showDots?: boolean;
}

/**
 * 极简趋势线（无坐标轴、无网格）
 * 用于首页体重卡、体重趋势页的简单示意
 */
export function MiniTrend({
  data,
  width = 240,
  height = 64,
  color = semantic.primary,
  fillColor = semantic.primarySoft,
  showDots = false,
}: MiniTrendProps) {
  if (data.length === 0) {
    return <View style={{ width, height }} />;
  }

  const pad = 6;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = data.length === 1 ? w / 2 : pad + (w * i) / (data.length - 1);
    // 数值越大越靠上
    const y = pad + h - ((v - min) / range) * h;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  const areaPath =
    `M ${points[0].x.toFixed(2)} ${(height - pad).toFixed(2)} ` +
    points.map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ') +
    ` L ${points[points.length - 1].x.toFixed(2)} ${(height - pad).toFixed(2)} Z`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Path d={areaPath} fill={fillColor} opacity={0.45} />
        <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {showDots
          ? points.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
            ))
          : null}
      </Svg>
    </View>
  );
}

export default MiniTrend;
