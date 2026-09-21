import { Platform } from 'react-native';
import { MMKV } from 'react-native-mmkv';

/**
 * MMKV 存储封装
 *
 * - 同步、加密、零依赖
 * - 设计原则：
 *   1. 所有业务数据走 getJSON / setJSON，便于后续无痛迁移到云数据库
 *   2. 不在 MMKV 里存大对象（>500KB），将来考虑 SQLite
 *   3. 敏感信息（未来 token）单独走 encryptedStore
 *
 * 使用示例：
 *   storage.set('user', { id: 'u1', name: '轻盈' });
 *   storage.get<User>('user');
 */

export const storage = new MMKV({
  id: 'proto-kaa.default',
  encryptionKey: undefined, // 后续接入 token 时启用
});

/**
 * Web 端 MMKV 不支持 encryptionKey（会抛错导致白屏），
 * 因此仅在原生端启用加密；Web 端由库自带的 localStorage 实现降级。
 */
export const encryptedStorage = new MMKV({
  id: 'proto-kaa.secure',
  ...(Platform.OS !== 'web'
    ? { encryptionKey: 'litelite-dev-key-change-me' } // TODO 接入真实密钥管理
    : {}),
});

/** StorageKey 注册：避免散落字符串 */
export const StorageKeys = {
  user: 'user',
  weightRecords: 'weight.records',
  dietRecords: 'diet.records',
  exerciseRecords: 'exercise.records',
  bodyStatusRecords: 'body.status.records',
  waterRecords: 'water.records',
  cycleRecords: 'cycle.records',
  weeklyReports: 'weekly.reports',
  aiMessages: 'ai.messages',
  appSettings: 'app.settings',
} as const;

export type StorageKey = (typeof StorageKeys)[keyof typeof StorageKeys];

/**
 * 类型安全的 getJSON / setJSON
 */
export function getJSON<T>(key: string): T | null {
  const s = storage.getString(key);
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function setJSON<T>(key: string, value: T): void {
  storage.set(key, JSON.stringify(value));
}

export function remove(key: string): void {
  storage.delete(key);
}

export function clearAll(): void {
  storage.clearAll();
}

/**
 * 便捷 hook-like 工具：监听某个 key 变化
 * Phase 0 暂不实现，后续 Zustand persist 中间件会自动处理
 */