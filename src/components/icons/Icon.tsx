import React from 'react';
import {
  Home,
  UtensilsCrossed,
  Plus,
  Footprints,
  User,
  Camera,
  Scale,
  Droplets,
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  MoreHorizontal,
  Sparkles,
  TrendingUp,
  Calendar,
  Settings as SettingsIcon,
  Flame,
  Smile,
  Moon,
  Activity,
  Sun,
  Search,
  Mic,
  Trash2,
  RotateCw,
  Upload,
} from 'lucide-react-native';
import { semantic } from '@/theme/colors';

export type IconName =
  | 'home'
  | 'utensils'
  | 'plus'
  | 'footprints'
  | 'user'
  | 'camera'
  | 'scale'
  | 'droplets'
  | 'heart'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'x'
  | 'check'
  | 'more'
  | 'sparkles'
  | 'trending-up'
  | 'calendar'
  | 'settings'
  | 'flame'
  | 'smile'
  | 'moon'
  | 'activity'
  | 'sun'
  | 'search'
  | 'mic'
  | 'trash'
  | 'refresh'
  | 'upload';

const ICONS: Record<IconName, React.ComponentType<any>> = {
  home: Home,
  utensils: UtensilsCrossed,
  plus: Plus,
  footprints: Footprints,
  user: User,
  camera: Camera,
  scale: Scale,
  droplets: Droplets,
  heart: Heart,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  x: X,
  check: Check,
  more: MoreHorizontal,
  sparkles: Sparkles,
  'trending-up': TrendingUp,
  calendar: Calendar,
  settings: SettingsIcon,
  flame: Flame,
  smile: Smile,
  moon: Moon,
  activity: Activity,
  sun: Sun,
  search: Search,
  mic: Mic,
  trash: Trash2,
  refresh: RotateCw,
  upload: Upload,
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  color = semantic.textPrimary,
  strokeWidth = 2,
}: IconProps) {
  const Cmp = ICONS[name];
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}

export default Icon;