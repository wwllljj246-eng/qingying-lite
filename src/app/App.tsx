import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { RootNavigator } from '@/navigation';

/**
 * 桌面 Web 端「手机模拟预览容器」。
 *
 * 设计基准：iPhone 17 — 402 × 874 px。
 *
 * 实现方式：仅在 Web 平台向 <head> 注入一段 CSS，把 RN 应用最外层 DOM
 * 节点 #root 固定为 402×874 并居中，外围留出灰色背景区域。
 *
 * - 不修改任何页面的设计尺寸、布局、逻辑、Store、导航或功能。
 * - 不影响 iOS / Android（原生平台完全不进入此分支）。
 * - 所有页面（含 TabBar、Bottom Sheet、Modal）都渲染在这个固定视口内：
 *   @gorhom/bottom-sheet 使用 absoluteFillObject，会铺满最近的「已定位」祖先，
 *   这里把 #root 设为 position:relative，因此底部 Sheet 也被限制在 402×874 内。
 * - 浏览器窗口高度不足 874 时，整块手机容器可随页面纵向滚动（body 允许滚动）。
 */
if (Platform.OS === 'web') {
  const doc = (globalThis as any).document as Document | undefined;
  if (doc && !doc.getElementById('lite-web-phone-frame')) {
    const style = doc.createElement('style');
    style.id = 'lite-web-phone-frame';
    style.textContent = `
      html, body { height: 100%; margin: 0; padding: 0; }
      body {
        background: #ECEFF4;
        display: flex;
        min-height: 100vh;
        overflow: auto !important;
      }
      #root {
        position: relative !important;
        flex: none !important;
        width: 402px !important;
        height: 874px !important;
        margin: auto !important;
        overflow: hidden !important;
        border-radius: 28px;
        background: #FEFFFA;
        box-shadow: 0 18px 50px rgba(31, 41, 55, 0.22);
      }
      #root > div {
        width: 402px !important;
        height: 874px !important;
      }
    `;
    doc.head.appendChild(style);
  }
}

export default function App() {
  return (
    <>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <RootNavigator />
    </>
  );
}
