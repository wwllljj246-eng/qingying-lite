import React from 'react';
import { View, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { semantic } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Typography } from '../common/Typography';
import { Icon, IconName } from '../icons';

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  transparent?: boolean;
  style?: ViewStyle;
}

export function Header({
  title,
  subtitle,
  leftIcon = 'chevron-left',
  rightIcon,
  onLeftPress,
  onRightPress,
  transparent = true,
  style,
}: HeaderProps) {
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: transparent ? 'transparent' : semantic.background },
        style,
      ]}
    >
      <View style={styles.side}>
        {onLeftPress ? (
          <Pressable onPress={onLeftPress} hitSlop={12} style={styles.btn}>
            <Icon name={leftIcon} size={22} color={semantic.textPrimary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        {title ? (
          <Typography variant="h3" align="center">
            {title}
          </Typography>
        ) : null}
        {subtitle ? (
          <Typography variant="caption" color="secondary" align="center">
            {subtitle}
          </Typography>
        ) : null}
      </View>
      <View style={[styles.side, styles.alignEnd]}>
        {onRightPress && rightIcon ? (
          <Pressable onPress={onRightPress} hitSlop={12} style={styles.btn}>
            <Icon name={rightIcon} size={22} color={semantic.textPrimary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  side: {
    minWidth: 40,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
});

export default Header;