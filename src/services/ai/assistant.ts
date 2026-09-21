/**
 * AI 助手 Service（Mock 流式输出）
 *
 * 真实路径：App → Backend /api/ai/chat (SSE) → LLM
 */

import type { AssistantRequest, AssistantChunk } from './types';

const PRESET_RESPONSES: Array<{ keywords: string[]; text: string }> = [
  {
    keywords: ['减肥', '瘦'],
    text: '减肥不是和食物作对，而是和身体协作。先关注一周的睡眠与三餐规律，比硬扛节食更有效哦。',
  },
  {
    keywords: ['吃什么', '推荐', '建议'],
    text: '如果你今天还没摄入足够蛋白质，可以试试：水煮蛋、希腊酸奶、豆腐、虾仁、鸡胸肉，每 100g 都超过 15g 蛋白。',
  },
  {
    keywords: ['运动', '跑步', '锻炼'],
    text: '中等强度有氧（快走 / 慢跑）每周 3~4 次、每次 30~45 分钟，对大多数人都足够。强度以微微出汗、能正常说话为准。',
  },
  {
    keywords: ['睡眠', '失眠'],
    text: '睡前 1 小时远离屏幕，做 5 分钟深呼吸；固定起床时间比硬睡更有效。',
  },
  {
    keywords: ['心情', '情绪', '焦虑'],
    text: '情绪波动和睡眠、水分、血糖都相关。先喝杯温水，再做 1 分钟呼吸。轻盈 app 陪你慢慢来。',
  },
];

const FALLBACK_TEXT =
  '我收到啦。我会结合你最近 7 天的体重、饮食和睡眠数据，给你更具体的建议～要不要先从今晚的晚餐聊起？';

const STREAM_DELAY_MS = 30;

/**
 * Mock 流式输出
 */
export async function* chatAssistantMock(
  req: AssistantRequest,
): AsyncGenerator<AssistantChunk, void, void> {
  const matched = PRESET_RESPONSES.find((p) =>
    p.keywords.some((k) => req.message.includes(k)),
  );
  const text = matched?.text ?? FALLBACK_TEXT;

  for (let i = 0; i < text.length; i++) {
    await new Promise((r) => setTimeout(r, STREAM_DELAY_MS));
    yield {
      delta: text[i],
      done: i === text.length - 1,
    };
  }
}

export async function* chatAssistant(
  req: AssistantRequest,
): AsyncGenerator<AssistantChunk, void, void> {
  yield* chatAssistantMock(req);
}