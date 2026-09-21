/**
 * 轻盈 Lite — 最小 AI Backend Service（零依赖 Node，使用内置 http + fetch）
 *
 * 职责：
 *   - AI 助手 / 营养分析（/api/ai/*，纯文本大模型）
 *   - 食物视觉识别 / OCR（/api/food/*，multipart 上传图片 + 视觉模型）
 *
 * ⚠️ 安全约定（务必遵守）：
 *   - 所有 AI API Key 只存在于本服务环境变量，绝不下发到前端 / 客户端代码。
 *   - 前端只请求 /api/ai/* 与 /api/food/*，永远拿不到任何密钥。
 *   - 只接收完成分析所需的最小数据，不接收账号密码等无关信息。
 *   - 图片只用于完成识别，不进行其他用途。
 *
 * 运行：
 *   node server/index.mjs
 *   或：cd server && npm start
 *
 * 环境变量（见 .env.example）：
 *   AI_API_KEY   大模型 API Key（视觉模型同样复用它；不配置则服务返回 503 AI_NOT_CONFIGURED）
 *   AI_BASE_URL  兼容 OpenAI 的接口地址，默认 https://api.openai.com/v1
 *   AI_MODEL     模型名，默认 gpt-4o-mini（需具备视觉能力）
 *   AI_TIMEOUT_MS 单次请求超时，默认 20000
 *   AI_DEMO      设为 1 时，未配置 Key 也返回一份「本地模拟」结构化结果，仅用于本地联调
 *   PORT         服务端口，默认 3000
 *   CORS_ORIGIN  允许的跨域来源，默认 *
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM 下无 __dirname，手动推导
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ----------------------------- 读取 .env（极简解析，无依赖） ----------------------------- */
function loadEnv() {
  const file = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 3000);
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 20000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const DEMO = process.env.AI_DEMO === '1';

/* 前端静态构建目录（同源部署）：可通过 WEB_DIR 覆盖 */
const WEB_DIR = process.env.WEB_DIR
  ? path.resolve(process.env.WEB_DIR)
  : path.resolve(__dirname, '../dist-web-showcase');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url);
  if (rel === '/' || rel === '') rel = '/index.html';
  const safeRel = path
    .normalize(rel)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');
  const filePath = path.join(WEB_DIR, safeRel);
  if (!filePath.startsWith(WEB_DIR)) {
    sendJSON(res, 403, { code: 'FORBIDDEN', message: 'invalid path' });
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 无扩展名 → 视为 SPA 路由，回退 index.html（刷新不 404）
      if (path.extname(filePath) === '') {
        fs.readFile(path.join(WEB_DIR, 'index.html'), (e2, d2) => {
          if (e2) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(d2);
          }
        });
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

/* ----------------------------- Prompt（角色与边界） ----------------------------- */

const ASSISTANT_SYSTEM_PROMPT = `你是「轻盈 Lite」的健康生活管理助手。

你的任务不是诊断疾病，也不是替代医生。请只根据用户近期真实记录，提供温和、具体、可执行的生活方式建议。

你可以参考的数据维度包括：体重、饮食、运动、睡眠、情绪、疲劳、身体状态，以及（仅当用户开启周期管理时）周期信息。

硬性要求：
1. 不进行任何疾病诊断。
2. 不判断用户是否患病。
3. 不提供任何处方或药物建议。
4. 不编造用户没有提供的任何数据。
5. 不把短期体重波动直接解释为脂肪增减。
6. 不做绝对化的减脂 / 减肥承诺。
7. 建议必须尽量引用用户真实记录中的具体数字与事实。
8. 如果某类数据不足，要明确指出「数据不足」，不要硬凑结论。
9. 周期信息只有用户明确开启周期管理（cycle.enabled 为 true）时才可使用；否则不要提及周期。

请严格以如下 JSON 结构回复（不要包含任何额外说明文字）：
{
  "summary": "今日总结，2~4 句，温和、具体、引用真实数据；若数据不足请直说",
  "suggestions": [
    { "type": "diet", "title": "饮食建议", "content": "……" },
    { "type": "exercise", "title": "运动建议", "content": "……" },
    { "type": "body", "title": "身体状态建议", "content": "……" }
  ]
}
suggestions 的 type 只能是 diet / exercise / body / general / cycle / weight 之一；若用户提问，请围绕问题给出 1~3 条建议。`;

const NUTRITION_SYSTEM_PROMPT = `你是「轻盈 Lite」的饮食营养分析助手。

你会收到一餐已识别出的食物列表（名称、份量、热量、蛋白质、碳水、脂肪）以及餐次类型。
前端已经按本地营养常量算好了总热量与三大营养素，请你基于这些真实数据做定性、温和的分析与建议。

硬性要求：
1. 不编造任何精确营养数字；已有计算数据优先采用，不要覆盖或虚构。
2. 不做医疗诊断、不开处方。
3. 不绝对化承诺。
4. 建议应具体、可执行，例如「下一餐可加一份优质蛋白」「蔬菜比例不错」。
5. 如果用户只提供少量信息，明确指出数据有限，给出保守建议即可。

请严格以如下 JSON 结构回复（不要包含任何额外说明文字）：
{
  "summary": "这餐的整体描述，2~3 句，基于真实食物与营养数据",
  "suggestions": ["建议一", "建议二"]
}`;

/* 视觉食物识别：只识别「是什么 + 大约多少」，营养交给前端本地常量 / OCR */
const FOOD_VISION_PROMPT = `你是「轻盈 Lite」的食物视觉识别助手。请识别这张餐盘 / 食物照片中的食物。

要求：
1. 只识别画面中明确可见的食物。
2. 对每种食物给出：名称（中文）、估算份量 estimatedAmount（数字）、单位 unit（只能是 g / ml / 个 / 碗 / 份 之一）、置信度 confidence（0~1 的小数）。
3. 不要编造画面中不存在的食物。
4. 不要估算营养数字（营养由其它流程负责），本接口只返回食物名称与份量。

请严格以如下 JSON 结构回复（不要包含任何额外说明文字）：
{
  "foods": [
    { "name": "米饭", "estimatedAmount": 150, "unit": "g", "confidence": 0.95 }
  ]
}`;

/* OCR：识别包装食品标签 / 营养成分表 / 菜单上的文字与营养 */
const OCR_PROMPT = `你是「轻盈 Lite」的 OCR 识别助手。请读取这张图片中的文字。

用途：可能是包装食品的营养成分表、产品名、菜单或食品标签。

要求：
1. text：把图片里读到的关键文字整理成一段字符串；如果读不到任何有意义文字，返回空字符串 ""。
2. productName：如果能识别到明确的食品 / 产品名称，返回它；否则返回 null。
3. nutrition：如果读到了营养成分表，请尽可能提取 calories(每100g或每包装 kcal)、protein(g)、fat(g)、carbs(g)；读不到的字段填 null。

请严格以如下 JSON 结构回复（不要包含任何额外说明文字）：
{
  "text": "……",
  "productName": "……" 或 null,
  "nutrition": { "calories": 200, "protein": 8, "fat": 5, "carbs": 30 }
}`;

/* ----------------------------- LLM 调用 ----------------------------- */

function parseJSONSafe(text) {
  if (typeof text !== 'string') return null;
  let t = text.trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(t.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callLLM(systemPrompt, userContent) {
  if (!AI_API_KEY) {
    if (DEMO) return null; // 交由调用方生成 demo 响应
    const err = new Error('AI service not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const err = new Error(`upstream ${res.status}`);
      err.code = 'AI_UPSTREAM';
      err.status = res.status;
      err.detail = detail;
      throw err;
    }

    const json = await res.json().catch(() => null);
    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      const err = new Error('empty completion');
      err.code = 'AI_EMPTY';
      throw err;
    }
    const parsed = parseJSONSafe(content);
    if (!parsed) {
      const err = new Error('bad json');
      err.code = 'AI_BAD_JSON';
      throw err;
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

/** 视觉模型调用（携带图片） */
async function callVision(systemPrompt, dataUrl) {
  if (!AI_API_KEY) {
    if (DEMO) return null; // 交由调用方生成 demo 响应
    const err = new Error('AI service not configured');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请按系统要求返回 JSON。' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      const err = new Error(`upstream ${res.status}`);
      err.code = 'AI_UPSTREAM';
      err.status = res.status;
      err.detail = detail;
      throw err;
    }

    const json = await res.json().catch(() => null);
    const content = json?.choices?.[0]?.message?.content;
    if (!content) {
      const err = new Error('empty completion');
      err.code = 'AI_EMPTY';
      throw err;
    }
    const parsed = parseJSONSafe(content);
    if (!parsed) {
      const err = new Error('bad json');
      err.code = 'AI_BAD_JSON';
      throw err;
    }
    return parsed;
  } finally {
    clearTimeout(timer);
  }
}

/* ----------------------------- Demo（无 Key 时本地模拟，仅联调） ----------------------------- */

function demoAssistant(userContext, question) {
  const parts = [];
  if (userContext.weight?.latest != null) parts.push(`最新体重约 ${userContext.weight.latest} kg`);
  if (userContext.diet?.mealCountToday > 0)
    parts.push(`今日已记录 ${userContext.diet.mealCountToday} 餐、约 ${Math.round(userContext.diet.kcalToday)} kcal`);
  if (userContext.exercise?.todayCount > 0)
    parts.push(`今日运动 ${userContext.exercise.todayCount} 次`);
  if (userContext.bodyStatus?.today) parts.push('已记录今日身体状态');

  const summary = parts.length
    ? `（本地演示模式）根据你已经记录的数据：${parts.join('，')}。整体节奏不错，继续保持规律记录，我会结合更多数据给出更贴合的建议。`
    : '（本地演示模式）目前还没有足够的记录，先记录饮食、运动或身体状态，我就能给你更有针对性的建议。';

  const suggestions = [
    { type: 'diet', title: '饮食建议', content: '优先保证蛋白质、蔬菜和充足饮水；记录越完整，建议越准。' },
    { type: 'exercise', title: '运动建议', content: '如果今天还没动，可以考虑 20~30 分钟轻到中等强度活动。' },
    { type: 'body', title: '身体状态建议', content: '规律作息和睡眠对状态影响很大，今晚尽量早点休息。' },
  ];
  if (userContext.cycle?.enabled)
    suggestions.push({ type: 'cycle', title: '周期建议', content: '周期管理已开启，可以结合阶段调整饮食与运动强度。' });

  if (question && question.trim()) {
    suggestions.unshift({ type: 'general', title: question.trim().slice(0, 20), content: summary });
  }
  return { summary, suggestions };
}

function demoNutrition(foods, mealType) {
  const totalCal = foods.reduce((s, f) => s + (f.calories || 0), 0);
  const names = foods.map((f) => f.name).join('、') || '食物';
  const hasVeg = foods.some((f) => /菜|菠菜|西兰花|青菜|生菜|番茄|黄瓜|沙拉/.test(f.name));
  const summary = `（本地演示模式）这餐识别到 ${foods.length} 种食物（${names}），合计约 ${Math.round(totalCal)} kcal。${hasVeg ? '蔬菜比例不错' : '可以适当增加一些蔬菜'}。整体结构比较均衡，继续保持记录即可。`;
  const suggestions = [
    '已有计算的营养数据优先采用；若还需补充，下一餐可加一份优质蛋白。',
    hasVeg ? '蔬菜比例不错，继续保持。' : '适当增加蔬菜会让这一餐更均衡。',
  ];
  return { summary, suggestions };
}

/** 食物视觉识别的 demo 结果（含本地营养，便于前端直接展示） */
function demoFoodRecognize() {
  return {
    foods: [
      { name: '米饭', estimatedAmount: 150, unit: 'g', confidence: 0.95, calories: 210, protein: 4, carbs: 46, fat: 0.5 },
      { name: '牛肉', estimatedAmount: 120, unit: 'g', confidence: 0.9, calories: 250, protein: 28, carbs: 0, fat: 15 },
      { name: '西兰花', estimatedAmount: 100, unit: 'g', confidence: 0.92, calories: 35, protein: 3, carbs: 7, fat: 0.4 },
      { name: '鸡蛋', estimatedAmount: 1, unit: '个', confidence: 0.88, calories: 75, protein: 6, carbs: 0.6, fat: 5 },
    ],
    text: '',
    productName: null,
    nutrition: null,
  };
}

function demoOcr() {
  return { text: '', productName: null, nutrition: null };
}

/* ----------------------------- HTTP 工具 ----------------------------- */

function sendJSON(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': CORS_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

function readRaw(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('image too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/* 极简 multipart/form-data 解析（无依赖） */
function parseMultipart(buf, contentType) {
  const bm = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '');
  if (!bm) return { fields: {}, files: {} };
  const boundary = (bm[1] || bm[2]).trim();
  const sep = Buffer.from('--' + boundary);
  const fields = {};
  const files = {};
  let idx = buf.indexOf(sep);
  while (idx !== -1) {
    const end = buf.indexOf(sep, idx + sep.length);
    if (end === -1) break;
    let seg = buf.slice(idx + sep.length, end);
    // 去掉段首的 \r\n 与段尾的 \r\n
    if (seg[0] === 0x0d && seg[1] === 0x0a) seg = seg.slice(2);
    if (seg.length >= 2 && seg[seg.length - 2] === 0x0d && seg[seg.length - 1] === 0x0a)
      seg = seg.slice(0, seg.length - 2);
    const headerEnd = seg.indexOf(Buffer.from('\r\n\r\n'));
    if (headerEnd === -1) {
      idx = end;
      continue;
    }
    const header = seg.slice(0, headerEnd).toString('utf8');
    const body = seg.slice(headerEnd + 4);
    const nameM = /name="([^"]+)"/i.exec(header);
    if (!nameM) {
      idx = end;
      continue;
    }
    const name = nameM[1];
    const fnM = /filename="([^"]*)"/i.exec(header);
    const ctM = /content-type:\s*([^\r\n]+)/i.exec(header);
    if (fnM && fnM[1]) {
      files[name] = {
        filename: fnM[1],
        contentType: ctM ? ctM[1].trim() : 'application/octet-stream',
        data: body,
      };
    } else {
      fields[name] = body.toString('utf8');
    }
    idx = end;
  }
  return { fields, files };
}

function isValidAssistant(data) {
  if (!data || typeof data !== 'object') return false;
  const ctx = data.userContext;
  if (!ctx || typeof ctx !== 'object') return false;
  return true;
}

function isValidNutrition(data) {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.foods)) return false;
  return true;
}

function isValidFoodResult(parsed) {
  if (!parsed || typeof parsed !== 'object') return false;
  return Array.isArray(parsed.foods);
}

/* 把视觉模型的 foods 规整成安全结构 */
function normalizeFoodResult(parsed) {
  const foods = (parsed.foods || [])
    .filter((f) => f && typeof f.name === 'string' && f.name.trim())
    .map((f) => {
      const amount = Number(f.estimatedAmount);
      const unit = ['g', 'ml', '个', '碗', '份'].includes(f.unit) ? f.unit : 'g';
      const confidence = Number(f.confidence);
      return {
        name: f.name.trim(),
        estimatedAmount: Number.isFinite(amount) && amount > 0 ? amount : 0,
        unit,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
        calories: typeof f.calories === 'number' ? f.calories : null,
        protein: typeof f.protein === 'number' ? f.protein : null,
        carbs: typeof f.carbs === 'number' ? f.carbs : null,
        fat: typeof f.fat === 'number' ? f.fat : null,
      };
    })
    .filter((f) => f.estimatedAmount > 0);
  return foods;
}

/* OCR 结果规整 */
function normalizeOcr(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const n = parsed.nutrition;
  const nutrition =
    n && typeof n === 'object'
      ? {
          calories: n.calories != null ? Number(n.calories) : null,
          protein: n.protein != null ? Number(n.protein) : null,
          fat: n.fat != null ? Number(n.fat) : null,
          carbs: n.carbs != null ? Number(n.carbs) : null,
        }
      : null;
  return {
    text: typeof parsed.text === 'string' ? parsed.text : '',
    productName: typeof parsed.productName === 'string' ? parsed.productName : null,
    nutrition,
  };
}

/* 若 OCR 拿到了明确营养，优先覆盖到名称最匹配的食物上 */
function applyOcrNutrition(foods, ocr) {
  if (!ocr || !ocr.nutrition) return foods;
  const name = ocr.productName;
  let target = null;
  if (name) {
    target = foods.find((f) => f.name.includes(name) || name.includes(f.name));
  }
  if (!target) return foods;
  const nu = ocr.nutrition;
  return foods.map((f) => {
    if (f !== target) return f;
    return {
      ...f,
      calories: nu.calories != null ? nu.calories : f.calories,
      protein: nu.protein != null ? nu.protein : f.protein,
      carbs: nu.carbs != null ? nu.carbs : f.carbs,
      fat: nu.fat != null ? nu.fat : f.fat,
    };
  });
}

/* ----------------------------- 路由 ----------------------------- */

const server = http.createServer(async (req, res) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    sendJSON(res, 204, {});
    return;
  }

  const url = (req.url || '/').split('?')[0];

  if (req.method === 'GET' && url === '/api/health') {
    sendJSON(res, 200, { ok: true, configured: Boolean(AI_API_KEY), demo: DEMO });
    return;
  }

  if (req.method === 'POST' && url === '/api/ai/assistant') {
    try {
      const body = await readBody(req);
      if (!isValidAssistant(body)) {
        sendJSON(res, 400, { code: 'BAD_REQUEST', message: '缺少 userContext' });
        return;
      }
      const userContext = body.userContext;
      const question = typeof body.question === 'string' ? body.question : '';
      const userContent = `以下是用户的近期记录（userContext），请据此给出建议。\n用户提问：${question || '（无，请给出今日综合建议）'}\n\nuserContext:\n${JSON.stringify(userContext, null, 2)}`;

      let parsed = await callLLM(ASSISTANT_SYSTEM_PROMPT, userContent);
      if (parsed === null) parsed = demoAssistant(userContext, question);

      if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.suggestions)) {
        sendJSON(res, 502, { code: 'AI_BAD_RESPONSE', message: '模型返回格式异常' });
        return;
      }
      const suggestions = (parsed.suggestions || [])
        .filter((s) => s && typeof s.content === 'string')
        .map((s) => ({
          type: ['diet', 'exercise', 'body', 'general', 'cycle', 'weight'].includes(s.type)
            ? s.type
            : 'general',
          title: typeof s.title === 'string' ? s.title : '建议',
          content: s.content,
        }));
      sendJSON(res, 200, { summary: parsed.summary, suggestions });
    } catch (err) {
      if (err?.code === 'AI_NOT_CONFIGURED') {
        sendJSON(res, 503, { code: 'AI_NOT_CONFIGURED', message: 'AI 服务未配置' });
        return;
      }
      sendJSON(res, 502, {
        code: err?.code || 'AI_ERROR',
        message: err?.message || 'AI 请求失败',
      });
    }
    return;
  }

  if (req.method === 'POST' && url === '/api/ai/nutrition') {
    try {
      const body = await readBody(req);
      if (!isValidNutrition(body)) {
        sendJSON(res, 400, { code: 'BAD_REQUEST', message: '缺少 foods' });
        return;
      }
      const foods = body.foods;
      const mealType = typeof body.mealType === 'string' ? body.mealType : 'meal';
      const totalCal = foods.reduce((s, f) => s + (Number(f.calories) || 0), 0);
      const userContent = `餐次类型：${mealType}\n本餐合计热量约 ${Math.round(totalCal)} kcal。\n食物列表：\n${JSON.stringify(foods, null, 2)}`;

      let parsed = await callLLM(NUTRITION_SYSTEM_PROMPT, userContent);
      if (parsed === null) parsed = demoNutrition(foods, mealType);

      if (typeof parsed.summary !== 'string' || !Array.isArray(parsed.suggestions)) {
        sendJSON(res, 502, { code: 'AI_BAD_RESPONSE', message: '模型返回格式异常' });
        return;
      }
      sendJSON(res, 200, {
        summary: parsed.summary,
        suggestions: (parsed.suggestions || []).filter((s) => typeof s === 'string'),
      });
    } catch (err) {
      if (err?.code === 'AI_NOT_CONFIGURED') {
        sendJSON(res, 503, { code: 'AI_NOT_CONFIGURED', message: 'AI 服务未配置' });
        return;
      }
      sendJSON(res, 502, {
        code: err?.code || 'AI_ERROR',
        message: err?.message || 'AI 请求失败',
      });
    }
    return;
  }

  /* ----------------------- 食物视觉识别 ----------------------- */
  if (req.method === 'POST' && url === '/api/food/recognize') {
    try {
      const buf = await readRaw(req);
      const ct = req.headers['content-type'] || '';
      const mp = parseMultipart(buf, ct);
      const file = mp.files['image'];
      if (!file) {
        sendJSON(res, 400, { code: 'BAD_REQUEST', message: '缺少 image 文件' });
        return;
      }
      const dataUrl = `data:${file.contentType};base64,${file.data.toString('base64')}`;

      // 主流程：视觉识别
      let visParsed = await callVision(FOOD_VISION_PROMPT, dataUrl);
      if (visParsed === null) visParsed = demoFoodRecognize();
      if (!isValidFoodResult(visParsed)) {
        sendJSON(res, 502, { code: 'AI_BAD_RESPONSE', message: '模型返回格式异常' });
        return;
      }
      let foods = normalizeFoodResult(visParsed);

      // 辅助流程：OCR（失败不影响主流程）
      let ocr = null;
      try {
        const ocrParsed = await callVision(OCR_PROMPT, dataUrl);
        ocr = normalizeOcr(ocrParsed);
      } catch {
        ocr = demoOcr();
      }
      if (ocr === null) ocr = demoOcr();

      // OCR 营养优先
      foods = applyOcrNutrition(foods, ocr);

      sendJSON(res, 200, {
        foods,
        text: ocr?.text ?? '',
        productName: ocr?.productName ?? null,
        nutrition: ocr?.nutrition ?? null,
      });
    } catch (err) {
      if (err?.code === 'AI_NOT_CONFIGURED') {
        sendJSON(res, 503, { code: 'AI_NOT_CONFIGURED', message: 'AI 服务未配置' });
        return;
      }
      sendJSON(res, 502, {
        code: err?.code || 'AI_ERROR',
        message: err?.message || '识别失败',
      });
    }
    return;
  }

  /* ----------------------- OCR 单独接口 ----------------------- */
  if (req.method === 'POST' && url === '/api/food/ocr') {
    try {
      const buf = await readRaw(req);
      const ct = req.headers['content-type'] || '';
      const mp = parseMultipart(buf, ct);
      const file = mp.files['image'];
      if (!file) {
        sendJSON(res, 400, { code: 'BAD_REQUEST', message: '缺少 image 文件' });
        return;
      }
      const dataUrl = `data:${file.contentType};base64,${file.data.toString('base64')}`;

      let parsed = await callVision(OCR_PROMPT, dataUrl);
      if (parsed === null) parsed = demoOcr();
      const ocr = normalizeOcr(parsed);
      sendJSON(res, 200, ocr || demoOcr());
    } catch (err) {
      if (err?.code === 'AI_NOT_CONFIGURED') {
        sendJSON(res, 503, { code: 'AI_NOT_CONFIGURED', message: 'AI 服务未配置' });
        return;
      }
      sendJSON(res, 502, {
        code: err?.code || 'AI_ERROR',
        message: err?.message || 'OCR 失败',
      });
    }
    return;
  }

  /* ----------------------- 静态资源 / SPA（同源部署前端） ----------------------- */
  if (req.method === 'GET' && !url.startsWith('/api/')) {
    serveStatic(req, res, url);
    return;
  }

  sendJSON(res, 404, { code: 'NOT_FOUND', message: 'unknown endpoint' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
  console.log(`Web: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api/health`);
});
