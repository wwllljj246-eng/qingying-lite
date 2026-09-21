import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { spacing } from '@/theme/spacing';
import { Typography } from '../common/Typography';

export interface SectionProps {
  title?: string;
  action?: React.ReactNode;
  gap?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

export function Section({ title, action, gap = spacing.md, style, children }: SectionProps) {
  return (
    <View style={[{ gap }, style]}>
      {title || action ? (
        <View style={styles.header}>
          {title ? (
            <Typography variant="h3">{title}</Typography>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default Section;