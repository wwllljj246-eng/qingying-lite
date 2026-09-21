import React from 'react';
import { View, ViewProps, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { semantic } from '@/theme/colors';
import { layout } from '@/theme/spacing';

export interface ScreenContainerProps extends ViewProps {
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  bg?: string;
  children: React.ReactNode;
}

/**
 * 屏幕容器
 * - 默认带背景、左右 20px、上下安全区
 * - 可选 ScrollView
 */
export function ScreenContainer({
  scroll = false,
  padded = true,
  edges = ['top', 'left', 'right'],
  bg = semantic.background,
  style,
  contentContainerStyle,
  children,
  ...rest
}: ScreenContainerProps) {
  const padding = padded ? layout.pagePaddingX : 0;
  if (scroll) {
    return (
      <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: bg }, style]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              paddingHorizontal: padding,
              paddingTop: layout.pagePaddingTop,
              paddingBottom: layout.pagePaddingBottom + 80, // 留出 TabBar
            },
            contentContainerStyle,
          ]}
          {...(rest as ScrollViewProps)}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.flex, { backgroundColor: bg }, style]}
      {...rest}
    >
      <View
        style={{
          flex: 1,
          paddingHorizontal: padding,
          paddingTop: layout.pagePaddingTop,
          paddingBottom: layout.pagePaddingBottom,
        }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

export default ScreenContainer;