/**
 * 本地食物数据库（Mock Food Database）
 *
 * 本阶段先用本地常量食物库支撑「搜索食物」功能：
 * - 每 100g 营养基准（热量 / 蛋白质 / 碳水 / 脂肪）
 * - 支持按单位（g / ml / 个 / 碗 / 份）换算
 * - 模糊搜索 + 份量实时营养计算
 *
 * 后续可替换为后端 / 云端食物库，接口保持一致即可。
 */

export type FoodCategory =
  | 'staple' // 主食
  | 'protein' // 蛋白质
  | 'vegetable' // 蔬菜
  | 'fruit' // 水果
  | 'dairy' // 乳制品
  | 'drink'; // 饮品

export interface FoodNutrition {
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
}

export interface FoodEntry {
  name: string;
  category: FoodCategory;
  /** 默认份量单位：g / ml / 个 / 碗 / 份 */
  unit: string;
  /** 每 100g 营养基准（个 / 碗 / 份 也以「每 100g」为基准，再按 gramsPerUnit 折算） */
  per100: FoodNutrition;
  /** 当 unit 非 g/ml 时，1 单位折合多少克（用于份量 → 克换算） */
  gramsPerUnit?: number;
}

export const FOOD_DATABASE: FoodEntry[] = [
  // ===== 主食 =====
  { name: '米饭', category: 'staple', unit: 'g', per100: { calories: 116, protein: 2.6, carbs: 25.9, fat: 0.3 } },
  { name: '面条', category: 'staple', unit: 'g', per100: { calories: 138, protein: 4.5, carbs: 25.0, fat: 1.0 } },
  { name: '馒头', category: 'staple', unit: 'g', per100: { calories: 223, protein: 7.0, carbs: 47.0, fat: 1.1 } },
  { name: '燕麦', category: 'staple', unit: 'g', per100: { calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 } },
  { name: '玉米', category: 'staple', unit: 'g', per100: { calories: 112, protein: 4.0, carbs: 22.8, fat: 1.2 } },
  { name: '红薯', category: 'staple', unit: 'g', per100: { calories: 99, protein: 1.1, carbs: 23.1, fat: 0.2 } },

  // ===== 蛋白质 =====
  { name: '鸡胸肉', category: 'protein', unit: 'g', per100: { calories: 133, protein: 19.4, carbs: 2.5, fat: 5.0 } },
  { name: '牛肉', category: 'protein', unit: 'g', per100: { calories: 195, protein: 20.0, carbs: 0.0, fat: 12.0 } },
  { name: '猪肉', category: 'protein', unit: 'g', per100: { calories: 143, protein: 20.3, carbs: 1.5, fat: 6.0 } },
  { name: '鸡蛋', category: 'protein', unit: '个', per100: { calories: 144, protein: 13.3, carbs: 2.8, fat: 9.0 }, gramsPerUnit: 50 },
  { name: '虾', category: 'protein', unit: 'g', per100: { calories: 99, protein: 18.6, carbs: 0.0, fat: 1.4 } },
  { name: '鱼', category: 'protein', unit: 'g', per100: { calories: 113, protein: 17.0, carbs: 0.0, fat: 5.0 } },

  // ===== 蔬菜 =====
  { name: '西兰花', category: 'vegetable', unit: 'g', per100: { calories: 36, protein: 4.1, carbs: 7.0, fat: 0.6 } },
  { name: '菠菜', category: 'vegetable', unit: 'g', per100: { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 } },
  { name: '番茄', category: 'vegetable', unit: 'g', per100: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
  { name: '黄瓜', category: 'vegetable', unit: 'g', per100: { calories: 15, protein: 0.8, carbs: 3.6, fat: 0.2 } },
  { name: '胡萝卜', category: 'vegetable', unit: 'g', per100: { calories: 39, protein: 1.0, carbs: 9.6, fat: 0.2 } },

  // ===== 水果 =====
  { name: '苹果', category: 'fruit', unit: '个', per100: { calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 }, gramsPerUnit: 180 },
  { name: '香蕉', category: 'fruit', unit: '个', per100: { calories: 93, protein: 1.4, carbs: 22.0, fat: 0.2 }, gramsPerUnit: 120 },
  { name: '橙子', category: 'fruit', unit: '个', per100: { calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1 }, gramsPerUnit: 150 },
  { name: '草莓', category: 'fruit', unit: 'g', per100: { calories: 32, protein: 1.0, carbs: 7.7, fat: 0.3 } },
  { name: '葡萄', category: 'fruit', unit: 'g', per100: { calories: 69, protein: 0.7, carbs: 18.1, fat: 0.2 } },

  // ===== 乳制品 =====
  { name: '牛奶', category: 'dairy', unit: 'ml', per100: { calories: 54, protein: 3.0, carbs: 4.8, fat: 3.2 } },
  { name: '酸奶', category: 'dairy', unit: 'g', per100: { calories: 72, protein: 3.3, carbs: 9.0, fat: 2.7 } },
  { name: '奶酪', category: 'dairy', unit: 'g', per100: { calories: 328, protein: 25.0, carbs: 3.5, fat: 24.0 } },

  // ===== 饮品 =====
  { name: '咖啡', category: 'drink', unit: 'ml', per100: { calories: 2, protein: 0.1, carbs: 0.0, fat: 0.0 } },
  { name: '茶', category: 'drink', unit: 'ml', per100: { calories: 1, protein: 0.0, carbs: 0.2, fat: 0.0 } },
];

/** 搜索结果展示用的分类元信息（emoji + 浅色背景） */
export const FOOD_CATEGORY_META: Record<
  FoodCategory,
  { label: string; emoji: string; bg: string }
> = {
  staple: { label: '主食', emoji: '🍚', bg: '#EAF9DA' },
  protein: { label: '蛋白质', emoji: '🍗', bg: '#FDE6EC' },
  vegetable: { label: '蔬菜', emoji: '🥦', bg: '#F1ECF8' },
  fruit: { label: '水果', emoji: '🍎', bg: '#FBF1D2' },
  dairy: { label: '乳制品', emoji: '🥛', bg: '#EAF9DA' },
  drink: { label: '饮品', emoji: '☕', bg: '#F7F8F1' },
};

/** 份量快捷选项（按单位） */
export function portionPresets(unit: string): number[] {
  if (unit !== 'g' && unit !== 'ml') return [0.5, 1, 1.5, 2];
  return [50, 100, 150, 200];
}

/** 默认份量（按单位） */
export function defaultPortion(unit: string): number {
  if (unit === 'ml') return 200;
  if (unit === 'g') return 100;
  return 1;
}

/** 单位 → 克换算（g/ml 1:1，个/碗/份按 gramsPerUnit） */
function unitToGrams(entry: FoodEntry, amount: number): number {
  if (entry.unit === 'g' || entry.unit === 'ml') return amount;
  return amount * (entry.gramsPerUnit ?? 100);
}

/** 根据份量实时计算营养（基于每 100g 基准） */
export function computeNutrition(entry: FoodEntry, amount: number): FoodNutrition {
  const grams = unitToGrams(entry, amount);
  const factor = grams / 100;
  return {
    calories: Math.max(0, Math.round(entry.per100.calories * factor)),
    protein: +(entry.per100.protein * factor).toFixed(1),
    carbs: +(entry.per100.carbs * factor).toFixed(1),
    fat: +(entry.per100.fat * factor).toFixed(1),
  };
}

/**
 * 模糊搜索（忽略大小写，中文直接包含匹配）
 * 输入「鸡」→ 鸡胸肉 / 鸡蛋；「牛」→ 牛肉；「米饭」→ 米饭
 */
export function searchFoods(query: string): FoodEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return FOOD_DATABASE.filter((f) => f.name.toLowerCase().includes(q));
}

/** 按名称精确查找（用于搜索结果 → 份量页 的参数回溯） */
export function findFoodByName(name: string): FoodEntry | undefined {
  return FOOD_DATABASE.find((f) => f.name === name);
}
