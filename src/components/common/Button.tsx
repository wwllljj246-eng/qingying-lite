import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
} from 'react-native';
import { semantic, palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { Typography } from './Typography';
import { Icon, IconName } from '../icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ai' | 'reward' | 'diet';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const VARIANT_BG: Record<ButtonVariant, string> = {
  primary: semantic.primary,
  secondary: semantic.primaryBg,
  ghost: 'transparent',
  ai: semantic.accentAI,
  reward: semantic.accentReward,
  diet: semantic.accentDiet,
};

const VARIANT_TEXT: Record<ButtonVariant, string> = {
  primary: palette.surface,
  secondary: semantic.textPrimary,
  ghost: semantic.primary,
  ai: palette.surface,
  reward: semantic.textPrimary,
  diet: semantic.textPrimary,
};

const VARIANT_PRESSED: Record<ButtonVariant, string> = {
  primary: '#7FA368',
  secondary: '#DDEAB8',
  ghost: semantic.primaryBg,
  ai: '#A89BD2',
  reward: '#E9CD7F',
  diet: '#EAB6C5',
};

const SIZE_PADDING: Record<ButtonSize, { v: number; h: number; height: number }> = {
  sm: { v: 8, h: 14, height: 36 },
  md: { v: 12, h: 18, height: 44 },
  lg: { v: 14, h: 22, height: 52 },
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  loading,
  fullWidth,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const sz = SIZE_PADDING[size];
  const textColor = VARIANT_TEXT[variant];
  const iconColor = textColor;
  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      android_ripple={{ color: VARIANT_PRESSED[variant], borderless: false }}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed ? VARIANT_PRESSED[variant] : VARIANT_BG[variant],
          paddingVertical: sz.v,
          paddingHorizontal: sz.h,
          minHeight: sz.height,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.5 : 1,
        },
        variant !== 'ghost' ? shadows.soft : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.row}>
          {iconLeft ? (
            <View style={styles.iconLeft}>
              <Icon name={iconLeft} size={18} color={iconColor} />
            </View>
          ) : null}
          <Typography variant="bodyStrong" style={{ color: textColor }}>
            {title}
          </Typography>
          {iconRight ? (
            <View style={styles.iconRight}>
              <Icon name={iconRight} size={18} color={iconColor} />
            </View>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconLeft: { marginRight: 2 },
  iconRight: { marginLeft: 2 },
});

export default Button;