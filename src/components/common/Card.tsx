import React from 'react';
import { View, ViewProps, StyleSheet, Pressable } from 'react-native';
import { semantic } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { shadows, ShadowKey } from '@/theme/shadows';

export type CardRadius = 'small' | 'large';

export interface CardProps extends ViewProps {
  radius?: CardRadius;
  padding?: number;
  background?: string;
  shadow?: ShadowKey;
  onPress?: () => void;
  bordered?: boolean;
}

export function Card({
  radius = 'large',
  padding = spacing.lg,
  shadow = 'soft',
  background = semantic.surface,
  bordered = false,
  onPress,
  style,
  children,
  ...rest
}: CardProps) {
  const computedRadius = radius === 'large' ? radii.largeCard : radii.smallCard;
  const containerStyle: ViewProps['style'] = [
    styles.base,
    {
      backgroundColor: background,
      borderRadius: computedRadius,
      padding,
    },
    bordered ? styles.bordered : null,
    shadow ? shadows[shadow] : null,
    style,
  ];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        android_ripple={{ color: semantic.primaryBg, borderless: false }}
        style={({ pressed }) => [
          containerStyle,
          pressed ? { opacity: 0.9 } : null,
        ]}
        {...(rest as any)}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={containerStyle} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  bordered: {
    borderWidth: 1,
    borderColor: semantic.border,
  },
});

export default Card;