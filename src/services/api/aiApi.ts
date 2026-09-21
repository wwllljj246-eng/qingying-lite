/**
 * AI 网络层（前端唯一直接接触后端 API 的地方）
 *
 * 页面 / Store 禁止直接 fetch；一律通过本文件（或编排层 service）调用。
 *
 * 职责：
 * - 拼接后端地址（来自 app.config.ts 的 apiBaseUrl）
 * - 统一超时（AbortController）
 * - 支持外部取消（外部 AbortSignal，用于页面离开时取消无效请求）
 * - 类型化错误（网络 / 超时 / 服务端 / 解析 / 取消 / mock）
 *
 * 安全：本文件不持有任何 API Key；密钥只存在于后端环境变量。
 */

import config from '@/constants/config';
import type {
  AssistantRequest,
  AssistantResponse,
  NutritionAIRequest,
  NutritionAIResponse,
} from '@/types/ai';

const DEFAULT_TIMEOUT_MS = 20000;

export type AIErrorKind =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'SERVER'
  | 'PARSE'
  | 'CANCELLED'
  | 'MOCK';

export class AIServiceError extends Error {
  kind: AIErrorKind;
  status?: number;

  constructor(kind: AIErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'AIServiceError';
    this.kind = kind;
    this.status = status;
  }
}

export interface RequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function postJSON<T>(
  path: string,
  body: unknown,
  opts: RequestOptions,
): Promise<T> {
  // 开发期强制走 Mock / 本地规则：直接抛错，由编排层回退到本地规则
  if (config.mockAI) {
    throw new AIServiceError('MOCK', 'mockAI 模式已开启，跳过真实请求');
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();

  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener('abort', onAbort);
  }

  try {
    let res: Response;
    try {
      res = await fetch(`${config.apiBaseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      // 区分「用户主动取消」与「超时 / 网络失败」
      if (opts.signal?.aborted || ctrl.signal.aborted) {
        throw new AIServiceError('CANCELLED', '请求已取消');
      }
      if ((e as Error)?.name === 'AbortError' || ctrl.signal.aborted) {
        throw new AIServiceError('TIMEOUT', 'AI 请求超时');
      }
      throw new AIServiceError('NETWORK', '无法连接到 AI 服务');
    }

    if (!res.ok) {
      let code = 'SERVER';
      try {
        const j = await res.json();
        if (j && typeof j.code === 'string') code = j.code;
      } catch {
        /* 忽略解析错误，使用默认 code */
      }
      throw new AIServiceError('SERVER', `AI 服务返回错误 ${res.status}（${code}）`, res.status);
    }

    const data = await res.json().catch(() => {
      throw new AIServiceError('PARSE', 'AI 响应解析失败');
    });
    return data as T;
  } finally {
    clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
  }
}

/** 请求 AI 个性化助手分析 */
export function requestAssistant(
  req: AssistantRequest,
  opts: RequestOptions = {},
): Promise<AssistantResponse> {
  return postJSON<AssistantResponse>('/api/ai/assistant', req, opts);
}

/** 请求 AI 饮食 / 营养分析 */
export function requestNutritionAnalysis(
  req: NutritionAIRequest,
  opts: RequestOptions = {},
): Promise<NutritionAIResponse> {
  return postJSON<NutritionAIResponse>('/api/ai/nutrition', req, opts);
}
