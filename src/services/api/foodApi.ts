/**
 * 食物识别 / OCR 网络层（前端唯一直接接触后端 /api/food/* 的地方）
 *
 * 页面 / Store 禁止直接 fetch；一律通过本文件（或编排层 service）调用。
 *
 * 职责：
 * - 拼接后端地址（来自 app.config.ts 的 apiBaseUrl）
 * - 以 multipart/form-data 上传图片（移动端传本地 uri，Web 传 File/Blob）
 * - 统一超时（AbortController）与外部取消
 * - 类型化错误（网络 / 超时 / 服务端 / 取消 / mock）
 *
 * 安全：本文件不持有任何 API Key；密钥只存在于后端环境变量。
 */

import config from '@/constants/config';
import { AIServiceError } from './aiApi';

const FOOD_TIMEOUT_MS = 25000;

export type FoodImageInput = { uri: string } | { file: unknown };

export interface FoodRecognizeItem {
  name: string;
  estimatedAmount: number;
  unit: string;
  confidence: number;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface FoodOcrNutrition {
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
}

export interface FoodRecognizeResponse {
  foods: FoodRecognizeItem[];
  text?: string;
  productName?: string | null;
  nutrition?: FoodOcrNutrition | null;
}

export interface FoodOcrResponse {
  text: string;
  productName: string | null;
  nutrition: FoodOcrNutrition | null;
}

function buildForm(input: FoodImageInput): FormData {
  const form = new FormData();
  if ('file' in input && input.file) {
    const f = input.file as { name?: string } & Blob;
    form.append('image', f, f.name || 'photo.jpg');
  } else if ('uri' in input && input.uri) {
    // React Native 上传本地文件：传 { uri, name, type } 对象
    form.append(
      'image',
      { uri: input.uri, name: 'photo.jpg', type: 'image/jpeg' } as unknown as Blob,
    );
  }
  return form;
}

async function postFoodForm<T>(endpoint: string, input: FoodImageInput): Promise<T> {
  if (config.mockAI) {
    throw new AIServiceError('MOCK', 'mockAI 模式已开启，跳过真实识别');
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FOOD_TIMEOUT_MS);

  try {
    const res = await fetch(`${config.apiBaseUrl}${endpoint}`, {
      method: 'POST',
      body: buildForm(input),
      signal: ctrl.signal,
    });

    if (!res.ok) {
      let code = 'SERVER';
      try {
        const j = await res.json();
        if (j && typeof j.code === 'string') code = j.code;
      } catch {
        /* ignore */
      }
      throw new AIServiceError('SERVER', `食物服务返回错误 ${res.status}（${code}）`, res.status);
    }

    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof AIServiceError) throw e;
    if ((e as Error)?.name === 'AbortError' || ctrl.signal.aborted) {
      throw new AIServiceError('TIMEOUT', '食物识别超时');
    }
    // fetch 失败（网络断开等）
    throw new AIServiceError('NETWORK', '无法连接到食物识别服务');
  } finally {
    clearTimeout(timer);
  }
}

/** 视觉食物识别（主流程） */
export function recognizeFood(
  input: FoodImageInput,
  opts: { signal?: AbortSignal } = {},
): Promise<FoodRecognizeResponse> {
  if (opts.signal?.aborted) {
    return Promise.reject(new AIServiceError('CANCELLED', '请求已取消'));
  }
  return postFoodForm<FoodRecognizeResponse>('/api/food/recognize', input);
}

/** OCR（辅助流程：包装食品标签 / 营养成分表 / 菜单） */
export function recognizeOcr(
  input: FoodImageInput,
  opts: { signal?: AbortSignal } = {},
): Promise<FoodOcrResponse> {
  if (opts.signal?.aborted) {
    return Promise.reject(new AIServiceError('CANCELLED', '请求已取消'));
  }
  return postFoodForm<FoodOcrResponse>('/api/food/ocr', input);
}
