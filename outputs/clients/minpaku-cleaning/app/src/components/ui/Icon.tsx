import {
  ArrowLeft,
  Ban,
  Bell,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  ChevronRight,
  CircleCheckBig,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Copy,
  Ellipsis,
  FileCheck,
  History,
  House,
  IdCard,
  Info,
  LayoutDashboard,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserPlus,
  UserX,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

// 使用中の icon のみ取り込む（lucide-react 全 1700+ アイコンを bundle しないように）。
// 新規アイコンを追加するときは上の named import に追加してこのマップにも登録する。
const ICONS = {
  ArrowLeft,
  Ban,
  Bell,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  ChevronRight,
  CircleCheckBig,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Copy,
  Ellipsis,
  FileCheck,
  History,
  House,
  IdCard,
  Info,
  LayoutDashboard,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldPlus,
  Sparkles,
  Trash2,
  TriangleAlert,
  UserPlus,
  UserX,
  Users,
  X,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 18, className = "", strokeWidth = 2 }: IconProps) {
  const Comp = ICONS[name];
  if (!Comp) return null;
  return (
    <Comp
      size={size}
      strokeWidth={strokeWidth}
      className={`inline-block shrink-0 ${className}`}
      aria-hidden="true"
    />
  );
}
