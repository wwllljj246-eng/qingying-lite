/**
 * 数值 / 文本格式化
 */

export function formatNumber(n: number, digits: number = 0): string {
  if (!Number.isFinite(n)) return '0';
  return n.toFixed(digits);
}

export function formatCalories(kcal: number): string {
  return `${formatNumber(kcal, 0)} kcal`;
}

export function formatWeight(kg: number | null | undefined, digits: number = 1): string {
  return typeof kg === 'number' && Number.isFinite(kg) ? `${kg.toFixed(digits)} kg` : '—';
}

export function formatWater(ml: number | null | undefined): string {
  if (typeof ml !== 'number' || !Number.isFinite(ml)) return '—';
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${ml} ml`;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return '—';
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} 小时` : `${h}h ${m}m`;
}

export function formatSigned(n: number | null | undefined, digits: number = 1): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  if (n === 0) return '0';
  return n > 0 ? `+${n.toFixed(digits)}` : n.toFixed(digits);
}

/** 简单 id 生成器（Phase 0 用即可，后续可替换为 nanoid） */
export function genId(prefix: string = ''): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return prefix ? `${prefix}_${t}${r}` : `${t}${r}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return clamp((part / total) * 100, 0, 100);
}