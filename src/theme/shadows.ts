import { Platform, ViewStyle } from 'react-native';

/**
 * 阴影：柔和、轻盈
 * 单一阴影色源：低饱和绿灰，避免黑灰带来的硬朗感
 */
const SHADOW_COLOR = '#A8C68A';

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  soft: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 4,
  },
  large: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  fab: {
    shadowColor: SHADOW_COLOR,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 10,
  },
} as const satisfies Record<string, ViewStyle>;

export type ShadowKey = keyof typeof shadows;
export default shadows;

// 仅在 iOS 上开启阴影；Android 使用 elevation
export const hasShadow = Platform.OS === 'ios';