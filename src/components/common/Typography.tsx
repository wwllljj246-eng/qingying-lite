import React from 'react';
import { Text, TextProps } from 'react-native';
import { semantic, palette } from '@/theme/colors';
import { typography, TypographyKey } from '@/theme/typography';

type Variant = TypographyKey;
type ColorKey = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'primaryAccent' | 'aiAccent' | 'reward' | 'diet';

export interface TypographyProps extends TextProps {
  variant?: Variant;
  color?: ColorKey;
  align?: 'left' | 'center' | 'right';
  weight?: '400' | '500' | '600' | '700';
}

const COLOR_MAP: Record<ColorKey, string> = {
  primary: semantic.textPrimary,
  secondary: semantic.textSecondary,
  tertiary: semantic.textTertiary,
  inverse: palette.surface,
  primaryAccent: semantic.primary,
  aiAccent: semantic.accentAI,
  reward: semantic.accentReward,
  diet: semantic.accentDiet,
};

export function Typography({
  variant = 'body',
  color = 'primary',
  align,
  weight,
  style,
  children,
  ...rest
}: TypographyProps) {
  const baseStyle = typography[variant];
  return (
    <Text
      {...rest}
      style={[
        baseStyle,
        { color: COLOR_MAP[color] },
        align ? { textAlign: align } : null,
        weight ? { fontWeight: weight } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/** 便捷别名 */
export const H1 = (p: Omit<TypographyProps, 'variant'>) => <Typography {...p} variant="h1" />;
export const H2 = (p: Omit<TypographyProps, 'variant'>) => <Typography {...p} variant="h2" />;
export const H3 = (p: Omit<TypographyProps, 'variant'>) => <Typography {...p} variant="h3" />;
export const Body = (p: Omit<TypographyProps, 'variant'>) => <Typography {...p} variant="body" />;
export const Caption = (p: Omit<TypographyProps, 'variant'>) => <Typography {...p} variant="caption" />;
export const Number_ = (p: Omit<TypographyProps, 'variant'>) => <Typography {...p} variant="number" />;

export default Typography;