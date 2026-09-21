/**
 * App bootstrap：初始化副作用（字体、Mock 数据等）
 * Phase 0 暂为空，后续接入字体加载、首次启动引导等
 */

export async function bootstrap(): Promise<void> {
  // 占位：未来这里会加载字体、初始化种子数据、预热 MMKV 等
  if (__DEV__) {
    console.log('[bootstrap] 轻盈 Lite starting…');
  }
}

export default bootstrap;