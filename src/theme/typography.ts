import { Platform, TextStyle } from 'react-native';

/**
 * 字体家族
 * iOS 使用系统 SF，中文回退到 PingFang SC
 * Android 使用 Noto Sans SC（Expo 字体加载后可替换）
 */
const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const fontFamilyMono = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

/**
 * 排印样式：与设计稿对齐
 * h1 28 / h2 22 / h3 18 / body 15 / caption 13 / number 32
 */
export const typography = {
  h1: {
    fontFamily,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  h2: {
    fontFamily,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  h3: {
    fontFamily,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 0,
  },
  body: {
    fontFamily,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0,
  },
  bodyStrong: {
    fontFamily,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 0,
  },
  caption: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  captionStrong: {
    fontFamily,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  micro: {
    fontFamily,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  number: {
    fontFamily: fontFamilyMono,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  numberSmall: {
    fontFamily: fontFamilyMono,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
} as const satisfies Record<string, TextStyle>;

export type TypographyKey = keyof typeof typography;
export default typography;