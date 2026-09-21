import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: '轻盈 Lite',
  slug: 'lite-app',
  version: '0.1.0',
  orientation: 'portrait',
  scheme: 'litelite',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    resizeMode: 'contain',
    backgroundColor: '#FEFFFA',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.litelite.app',
    userInterfaceStyle: 'light',
    infoPlist: {
      NSCameraUsageDescription: '允许轻盈 Lite 使用相机来拍摄饮食照片，便于 AI 识别食物与营养分析。',
    },
  },
  android: {
    package: 'com.litelite.app',
    userInterfaceStyle: 'light',
    // expo-camera 插件会自动补上 CAMERA 权限；这里显式声明以防遗漏
    permissions: ['CAMERA'],
  },
  web: {
    bundler: 'metro',
  },
  // expo-camera 未声明 expo-plugin 自动注入，需显式列出以补齐 Android CAMERA 权限
  plugins: ['expo-camera'],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    // 生产环境强制同源（空串）：前端请求 /api/*（同源），绝不写死 localhost / 127.0.0.1。
    // 开发环境：优先 EXPO_PUBLIC_API_URL，未设置时回退本机后端（仅本地开发用）。
    apiBaseUrl:
      (process.env.EXPO_PUBLIC_APP_ENV || 'development') === 'production'
        ? ''
        : process.env.EXPO_PUBLIC_API_URL !== undefined
          ? process.env.EXPO_PUBLIC_API_URL
          : 'http://localhost:3000',
    appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'development',
    mockAI: false,
  },
});