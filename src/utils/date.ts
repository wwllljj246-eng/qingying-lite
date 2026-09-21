/**
 * 日期工具
 */

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date | string | number): string {
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toISODateTime(d: Date | string | number): string {
  const date = new Date(d);
  return date.toISOString();
}

export function parseISODate(s: string): Date {
  // 仅解析 YYYY-MM-DD 时按本地时区，避免时区漂移
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
}

export function startOfWeek(d: Date = new Date()): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun
  // 以周一作为周首日
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfWeek(d: Date = new Date()): Date {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function addDays(d: Date, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

export function diffDays(a: Date | string, b: Date | string): number {
  const da = typeof a === 'string' ? parseISODate(a) : a;
  const db = typeof b === 'string' ? parseISODate(b) : b;
  return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

export function greetingByHour(hour: number = new Date().getHours()): string {
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早安';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
}