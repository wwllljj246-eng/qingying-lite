/**
 * 颜色系统：轻盈 Lite 设计令牌
 *
 * 主色：绿色（健康、主要操作）
 * 辅助：粉色（饮食/周期）、紫色（AI）、米黄（成就/积极反馈）
 * 背景：奶油白
 * 文字：非纯黑，柔和深绿灰
 */

export const palette = {
  // 主色 — 绿
  green50: '#F4F9EB',
  green100: '#EAF9DA',
  green200: '#CDE9C0',
  green300: '#B8D9A0',
  green400: '#A8C68A', // 主色 primary
  green500: '#8FB070',
  green600: '#719456',
  green700: '#566E42',
  green800: '#3E4F31',
  green900: '#2E332F', // 主文字色

  // 背景 / 米白
  cream: '#FEFFFA',
  creamWarm: '#FAF8F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F8F1',

  // 文字
  textPrimary: '#2E332F',
  textSecondary: '#7A8270',
  textTertiary: '#B4B9AB',
  textDisabled: '#D6D9CC',

  // 辅助 — 粉（饮食 / 周期）
  pink50: '#FDE6EC',
  pink100: '#FBD0DC',
  pink200: '#F6CFD8', // 主粉
  pink300: '#EAB6C5',
  pink400: '#D89BAC',

  // 辅助 — 紫（AI）
  purple50: '#F1ECF8',
  purple100: '#E2DDF5',
  purple200: '#BDB2E3', // 主紫
  purple300: '#A89BD2',
  purple400: '#8E80BD',

  // 辅助 — 米黄（成就 / 积极反馈）
  yellow50: '#FBF1D2',
  yellow100: '#F8E8B5',
  yellow200: '#F5E2A1', // 主黄
  yellow300: '#E9CD7F',
  yellow400: '#D2B056',

  // 状态
  success: '#A8C68A',
  warning: '#F5E2A1',
  danger: '#F4B7B0',

  // 边框 / 分隔
  border: '#EEEFE7',
  borderStrong: '#E2E5D8',
  divider: '#F2F3EA',

  // 遮罩
  overlay: 'rgba(46, 51, 40, 0.45)',
  overlayLight: 'rgba(46, 51, 40, 0.10)',
} as const;

export type PaletteKey = keyof typeof palette;

/** 语义化颜色：业务里尽量只用语义色，不直接用 palette */
export const semantic = {
  background: palette.cream,
  surface: palette.surface,
  surfaceAlt: palette.surfaceAlt,

  primary: palette.green400,
  primarySoft: palette.green200,
  primaryBg: palette.green100,

  textPrimary: palette.textPrimary,
  textSecondary: palette.textSecondary,
  textTertiary: palette.textTertiary,

  accentDiet: palette.pink200,
  accentDietSoft: palette.pink50,
  accentCycle: palette.pink200,
  accentCycleSoft: palette.pink50,

  accentAI: palette.purple200,
  accentAISoft: palette.purple50,

  accentReward: palette.yellow200,
  accentRewardSoft: palette.yellow50,

  success: palette.success,
  warning: palette.warning,
  danger: palette.danger,

  border: palette.border,
  divider: palette.divider,
} as const;

export const colors = { palette, semantic };
export default colors;