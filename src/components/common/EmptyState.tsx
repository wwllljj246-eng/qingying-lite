import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { spacing } from '@/theme/spacing';
import { Button } from './Button';
import { Typography } from './Typography';

export interface EmptyStateProps {
  /** emoji（产品内容本身，如 🌿）或文字符号 */
  icon: string;
  /** 主文案，统一话术："还没有 xx 记录" */
  title: string;
  /** 说明文案（可选） */
  description?: string;
  /** 行动按钮文案（可选），如 "去记录" */
  actionLabel?: string;
  onAction?: () => void;
  /** 紧凑模式（嵌入卡片内部时用，更小的留白） */
  compact?: boolean;
  style?: ViewStyle;
}

/**
 * 统一空状态（Task 10）
 * - 紧凑竖排：emoji + 标题 + 说明 + 可选按钮
 * - 不占满整屏，避免"大面积空白 + 一句话"
 * - 话术统一为"还没有…"，不猜测数据
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
  style,
}: EmptyStateProps) {
  return (
    <View
      style={[styles.base, compact ? styles.compact : styles.regular, style]}
    >
      <Typography variant={compact ? 'h3' : 'h2'} style={styles.icon}>
        {icon}
      </Typography>
      <Typography variant="bodyStrong" color="primary" align="center">
        {title}
      </Typography>
      {description ? (
        <Typography variant="caption" color="secondary" align="center" style={styles.description}>
          {description}
        </Typography>
      ) : null}
      {actionLabel && onAction ? (
        <View style={styles.actionWrap}>
          <Button title={actionLabel} variant="primary" size="sm" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  regular: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  compact: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  icon: {
    marginBottom: spacing.sm,
  },
  description: {
    marginTop: spacing.xs,
  },
  actionWrap: {
    marginTop: spacing.md,
  },
});

export default EmptyState;
