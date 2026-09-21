import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, Pressable, Platform } from 'react-native';
// react-dom 仅用于 Web 端把 BottomSheet 提升到 #root；原生端不会执行此分支。
// 该包在 Web 构建中可用，这里忽略其类型声明（不影响运行）。
// @ts-ignore
import { createPortal } from 'react-dom';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  BottomSheetScrollView,
  type BottomSheetProps,
} from '@gorhom/bottom-sheet';
import { semantic, palette } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { Icon } from '../icons';
import { Typography } from './Typography';

/**
 * Web 端把 BottomSheet 提升到 #root（手机模拟视口）渲染，确保层级高于固定 TabBar（zIndex:10）。
 *
 * 内联 BottomSheet 默认渲染在页面流内，会被页面自身的 stacking context 压在 TabBar 之下，
 * 因此 Web 端用 createPortal 把它挂到 #root，并配合 style.zIndex:100 解决遮挡；
 * 原生端保持原位渲染（内联 BottomSheet 在原生层的层级表现正常）。
 * createPortal 仅 Static import（Metro 可解析）；原生构建不会执行此分支（isWeb 为假）。
 */
const isWeb = Platform.OS === 'web';

export interface ModalSheetProps
  extends Omit<BottomSheetProps, 'snapPoints' | 'children'> {
  title?: string;
  snapPoints?: Array<string | number>;
  onDismiss?: () => void;
  showHandle?: boolean;
  showClose?: boolean;
  /**
   * 开启后：标题固定在顶部，内容区为可滚动的 BottomSheetScrollView，
   * 适合内容超过一屏的长表单（如记录身体状态、添加饮食入口）。
   * 需配合足够高的 snapPoints 使用。
   */
  scrollable?: boolean;
  /** 固定在 Sheet 底部、不随内容滚动的区域（仅 scrollable 模式生效），如保存按钮 */
  footer?: React.ReactNode;
  /** 受控显隐（可选）。不传则按「挂载即显示」处理（现有调用方均为条件渲染） */
  visible?: boolean;
  children: React.ReactNode;
}

export function ModalSheet({
  title,
  snapPoints = ['50%', '90%'],
  onDismiss,
  showHandle = true,
  showClose = true,
  scrollable = false,
  footer,
  visible,
  children,
  ...rest
}: ModalSheetProps) {
  const insets = useSafeAreaInsets();
  const normalizedSnapPoints = useMemo(() => snapPoints, [snapPoints]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
        pressBehavior="close"
      />
    ),
    [],
  );

  const header =
    title || showClose ? (
      <View style={styles.header}>
        {title ? (
          <Typography variant="h3">{title}</Typography>
        ) : (
          <View />
        )}
        {showClose ? (
          <Pressable
            onPress={onDismiss}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <Icon name="x" size={20} color={semantic.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    ) : null;

  const sheet = (
    <BottomSheet
      // 抬高层级：必须高于底部 TabBar 的 zIndex:10，避免被遮挡
      style={styles.overlay}
      index={0}
      snapPoints={normalizedSnapPoints}
      // scrollable 模式下关闭动态高度：以 snapPoints 为准，
      // 使内容区获得固定可视高度，让 ScrollView 正常滚动（Web 滚轮 / 移动端触摸均生效）
      enableDynamicSizing={!scrollable}
      enablePanDownToClose
      // 关闭（滑动到底 / 点击遮罩 / 点击关闭按钮）统一回调 onDismiss，由调用方收起
      onClose={onDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.bg}
      handleIndicatorStyle={styles.handle}
      handleComponent={
        showHandle ? undefined : () => <View style={styles.noHandle} />
      }
      {...rest}
    >
      {scrollable ? (
        <View style={styles.scrollInner}>
          {header}
          <BottomSheetScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </BottomSheetScrollView>
          {footer != null ? (
            <View
              style={[
                styles.footer,
                // 底部预留 safe area，避免保存按钮贴边/被遮挡
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}
            >
              {footer}
            </View>
          ) : null}
        </View>
      ) : (
        <BottomSheetView style={styles.content}>
          {header}
          {children}
        </BottomSheetView>
      )}
    </BottomSheet>
  );

  // 受控显隐：visible 为 false（或不传但处于隐藏态）时不渲染。
  // 调用方通常「挂载即显示」（条件渲染），此时 visible 为 true（或不传）。
  if (!(visible ?? true)) {
    return null;
  }

  if (isWeb) {
    const host = (globalThis as any).document?.getElementById('root');
    if (host) {
      return createPortal(sheet, host);
    }
  }
  return sheet;
}

const styles = StyleSheet.create({
  // 浮层覆盖整个视口，并高于底部 TabBar（zIndex:10）
  overlay: {
    zIndex: 100,
    elevation: 100,
  },
  bg: {
    backgroundColor: semantic.background,
    borderTopLeftRadius: radii.largeCard,
    borderTopRightRadius: radii.largeCard,
    ...shadows.large,
  },
  handle: {
    backgroundColor: palette.green200,
    width: 40,
    height: 4,
  },
  noHandle: {
    height: 0,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.huge,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  /* --- scrollable 模式 --- */
  scrollInner: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: semantic.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ModalSheet;
