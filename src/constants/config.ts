import Constants from 'expo-constants';

/**
 * 应用运行时配置
 * 从 app.config.ts 的 extra 字段注入
 */
export interface AppConfig {
  apiBaseUrl: string;
  appEnv: 'development' | 'staging' | 'production';
  mockAI: boolean;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<AppConfig>;

export const config: AppConfig = {
  // 后端地址由 app.config 注入（生产走 EXPO_PUBLIC_API_URL；同源部署时为 ''）。
  // 默认同源空串，绝不硬编码 localhost / 127.0.0.1。
  apiBaseUrl: extra.apiBaseUrl ?? '',
  appEnv: extra.appEnv ?? 'development',
  // 默认走真实 AI 后端（/api/ai/*）；失败会自动回退到本地规则。
  // 设为 true 可强制跳过网络、直接使用本地规则（开发调试用）。
  mockAI: extra.mockAI ?? false,
};

export default config;