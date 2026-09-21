import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  Pressable,
  ViewStyle,
} from 'react-native';
import { semantic } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Typography } from './Typography';
import { Icon, IconName } from '../icons';

export interface InputProps extends TextInputProps {
  label?: string;
  helper?: string;
  error?: string;
  rightIcon?: IconName;
  rightText?: string;
  onRightPress?: () => void;
  containerStyle?: ViewStyle;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, helper, error, rightIcon, rightText, onRightPress, containerStyle, style, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: spacing.xs }, containerStyle]}>
      {label ? (
        <Typography variant="captionStrong" color="secondary">
          {label}
        </Typography>
      ) : null}
      <View
        style={[
          styles.field,
          {
            borderColor: error
              ? semantic.danger
              : focused
              ? semantic.primary
              : semantic.border,
          },
        ]}
      >
        <TextInput
          ref={ref}
          {...rest}
          placeholderTextColor={semantic.textTertiary}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, style]}
        />
        {rightText ? (
          <Pressable onPress={onRightPress} hitSlop={8} style={styles.rightTextWrap}>
            <Typography variant="caption" color="secondary">
              {rightText}
            </Typography>
          </Pressable>
        ) : null}
        {rightIcon ? (
          <Pressable onPress={onRightPress} hitSlop={8} style={styles.rightIcon}>
            <Icon name={rightIcon} size={18} color={semantic.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Typography variant="micro" color="diet">
          {error}
        </Typography>
      ) : helper ? (
        <Typography variant="micro" color="tertiary">
          {helper}
        </Typography>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: semantic.surface,
    borderRadius: radii.button,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: semantic.textPrimary,
    paddingVertical: 0,
  },
  rightTextWrap: {
    paddingHorizontal: spacing.xs,
  },
  rightIcon: {
    paddingHorizontal: spacing.xs,
  },
});

export default Input;