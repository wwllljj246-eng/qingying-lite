/**
 * 间距：4 倍数体系
 *  xs 4 / sm 8 / md 12 / lg 16 / xl 20 / xxl 24 / xxxl 32 / huge 48
 */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  giant: 64,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * 页面边距
 */
export const layout = {
  pagePaddingX: 20, // 页面左右
  pagePaddingTop: 16,
  pagePaddingBottom: 16,
  cardGap: 12, // 小卡间距
  sectionGap: 16, // 分区间距
  cardPadding: 16, // 卡片内边距
} as const;

export default { spacing, layout };