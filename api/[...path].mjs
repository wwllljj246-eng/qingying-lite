/**
 * 轻盈 Lite — Vercel Serverless Function（Node.js）
 *
 * 所有 /api/* 请求都进入本函数（api/[...path].mjs 是 Vercel 的 catch-all）。
 * 实际 API 逻辑来自 server/api-handler.mjs，与 Render 共用，确保行为一致、API 不丢。
 *
 * 注意：
 *   - 不监听端口，不使用 server.listen()。
 *   - AI_API_KEY 等密钥仅来自 Vercel 项目的环境变量（process.env）。
 *   - 前端（生产模式 apiBaseUrl=''）以同源 /api 方式调用，本函数即为同域后端。
 */

import { handleApi } from '../server/api-handler.mjs';

export default async function handler(req, res) {
  const handled = await handleApi(req, res);
  if (!handled) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ code: 'NOT_FOUND', message: 'unknown endpoint' }));
  }
}
