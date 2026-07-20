// src/components/Icon.tsx
// 项目全部图标集中在此：统一 1.8px 线宽、方端点，向旧版教科书的插图线条靠拢。
// 之所以不用 lucide-react 的具体图标，是为了让 `Scenario.icon` 的数据形状
// （`LucideIcon` 组件）原样保留——本文件的组件与之签名兼容，可整体替换。
import type { ComponentProps, FC } from 'react'

type IconProps = ComponentProps<'svg'>

function Glyph({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

type Icon = FC<IconProps>

export const ArrowLeft: Icon = (p) => <Glyph {...p}><path d="M19 12H5" /><path d="M11 6l-6 6 6 6" /></Glyph>
export const ArrowRight: Icon = (p) => <Glyph {...p}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></Glyph>
export const BookOpen: Icon = (p) => <Glyph {...p}><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" /><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z" /></Glyph>
export const BookOpenCheck: Icon = (p) => <Glyph {...p}><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z" /><path d="M22 10h-4a4 4 0 0 0-4 4v6a3 3 0 0 1 3-3h5z" /><path d="M16 4.5l2 2 4-4" /></Glyph>
export const Bot: Icon = (p) => <Glyph {...p}><rect x="5" y="9" width="14" height="10" rx="1" /><path d="M12 9V5" /><path d="M8 13.5h.01M16 13.5h.01" /><path d="M9 17h6" /><path d="M2 12v4M22 12v4" /></Glyph>
export const Briefcase: Icon = (p) => <Glyph {...p}><rect x="3" y="7" width="18" height="13" rx="1" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></Glyph>
export const Check: Icon = (p) => <Glyph {...p}><path d="M4 12.5l5 5L20 6.5" /></Glyph>
export const CheckCircle2: Icon = (p) => <Glyph {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 5-5.5" /></Glyph>
export const ChevronRight: Icon = (p) => <Glyph {...p}><path d="M9 6l6 6-6 6" /></Glyph>
export const Circle: Icon = (p) => <Glyph {...p}><circle cx="12" cy="12" r="9" /></Glyph>
export const CircleHelp: Icon = (p) => <Glyph {...p}><circle cx="12" cy="12" r="9" /><path d="M9.2 9a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4" /><path d="M12 17.5h.01" /></Glyph>
export const Clock: Icon = (p) => <Glyph {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Glyph>
export const Clock3: Icon = (p) => <Glyph {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5h3.5" /></Glyph>
export const Coffee: Icon = (p) => <Glyph {...p}><path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" /><path d="M8 5.5V4M12 5.5V4" /></Glyph>
export const Copy: Icon = (p) => <Glyph {...p}><rect x="9" y="9" width="12" height="12" rx="1" /><path d="M5 15V4a1 1 0 0 1 1-1h9" /></Glyph>
export const GraduationCap: Icon = (p) => <Glyph {...p}><path d="M2 9.5L12 5l10 4.5L12 14z" /><path d="M6 12v4.5c0 1.5 2.7 3 6 3s6-1.5 6-3V12" /><path d="M22 9.5V15" /></Glyph>
export const HelpCircle: Icon = (p) => <Glyph {...p}><circle cx="12" cy="12" r="9" /><path d="M9.2 9a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.4-2.8 4" /><path d="M12 17.5h.01" /></Glyph>
export const Hotel: Icon = (p) => <Glyph {...p}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 21v-4h6v4" /><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01" /></Glyph>
export const Keyboard: Icon = (p) => <Glyph {...p}><rect x="2" y="6" width="20" height="12" rx="1" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" /></Glyph>
export const Languages: Icon = (p) => <Glyph {...p}><path d="M2 6h10" /><path d="M7 3v3" /><path d="M4 6c0 4 2.5 7 5 8.5" /><path d="M10 6c0 4-2.5 7-5.5 8.5" /><path d="M12 21l4.5-10L21 21" /><path d="M13.8 17h5.4" /></Glyph>
export const Lightbulb: Icon = (p) => <Glyph {...p}><path d="M9 18h6" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.8.7 1 1.5 1 2.5h6c0-1 .2-1.8 1-2.5A6 6 0 0 0 12 3z" /></Glyph>
export const ListTree: Icon = (p) => <Glyph {...p}><path d="M21 6h-7" /><path d="M21 12h-9" /><path d="M21 18h-7" /><path d="M7 3v18" /><path d="M7 6H3" /><path d="M7 12H3" /><path d="M7 18H3" /></Glyph>
export const LoaderCircle: Icon = (p) => <Glyph {...p}><path d="M21 12a9 9 0 1 1-6.2-8.56" /></Glyph>
export const MapPin: Icon = (p) => <Glyph {...p}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></Glyph>
export const Menu: Icon = (p) => <Glyph {...p}><path d="M3 6h18M3 12h18M3 18h18" /></Glyph>
export const MessageCircle: Icon = (p) => <Glyph {...p}><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.5L3 21l2-5.6A8.5 8.5 0 1 1 21 11.5z" /></Glyph>
export const MessageSquare: Icon = (p) => <Glyph {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Glyph>
export const Mic: Icon = (p) => <Glyph {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></Glyph>
export const MicOff: Icon = (p) => <Glyph {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /><path d="M4 4l16 16" /></Glyph>
export const Minus: Icon = (p) => <Glyph {...p}><path d="M5 12h14" /></Glyph>
export const Moon: Icon = (p) => <Glyph {...p}><path d="M20 13.5A8.5 8.5 0 0 1 10.5 4 8.5 8.5 0 1 0 20 13.5z" /></Glyph>
export const PenLine: Icon = (p) => <Glyph {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></Glyph>
export const Plane: Icon = (p) => <Glyph {...p}><path d="M10.5 13.5L3 11l1.5-1.5L11 11l6.5-6.5a1.8 1.8 0 0 1 2.5 2.5L13.5 13.5l1.5 6.5L13.5 21z" /></Glyph>
export const Plus: Icon = (p) => <Glyph {...p}><path d="M12 5v14M5 12h14" /></Glyph>
export const RefreshCw: Icon = (p) => <Glyph {...p}><path d="M21 12a9 9 0 1 1-2.6-6.3" /><path d="M21 3v6h-6" /></Glyph>
export const RotateCcw: Icon = (p) => <Glyph {...p}><path d="M3 12a9 9 0 1 0 2.6-6.3" /><path d="M3 3v6h6" /></Glyph>
export const Route: Icon = (p) => <Glyph {...p}><circle cx="6" cy="19" r="2.5" /><circle cx="18" cy="5" r="2.5" /><path d="M8.5 19h6a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7h6" /></Glyph>
export const Send: Icon = (p) => <Glyph {...p}><path d="M21 3L10 14" /><path d="M21 3l-7 19-4-8-8-4z" /></Glyph>
export const Server: Icon = (p) => <Glyph {...p}><rect x="2" y="3" width="20" height="7" rx="1" /><rect x="2" y="14" width="20" height="7" rx="1" /><path d="M6 6.5h.01M6 17.5h.01" /></Glyph>
export const Settings: Icon = (p) => <Glyph {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></Glyph>
export const Settings2: Icon = (p) => <Glyph {...p}><path d="M4 7h9M17 7h3" /><circle cx="15" cy="7" r="2" /><path d="M4 17h3M11 17h9" /><circle cx="9" cy="17" r="2" /></Glyph>
export const ShieldCheck: Icon = (p) => <Glyph {...p}><path d="M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 5-5.5" /></Glyph>
export const Sparkles: Icon = (p) => <Glyph {...p}><path d="M12 4l1.8 4.7L18.5 10l-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.3z" /><path d="M19 15l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></Glyph>
export const Square: Icon = (p) => <Glyph {...p}><rect x="5" y="5" width="14" height="14" rx="1" /></Glyph>
export const Sun: Icon = (p) => <Glyph {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.5 4.5l2 2M17.5 17.5l2 2M19.5 4.5l-2 2M6.5 17.5l-2 2" /></Glyph>
export const TextCursorInput: Icon = (p) => <Glyph {...p}><rect x="2" y="5" width="20" height="14" rx="1" /><path d="M12 8v8" /><path d="M9.5 8h5M9.5 16h5" /></Glyph>
export const TriangleAlert: Icon = (p) => <Glyph {...p}><path d="M12 4L2 20h20z" /><path d="M12 10v4" /><path d="M12 17.5h.01" /></Glyph>
export const Volume2: Icon = (p) => <Glyph {...p}><path d="M11 5L6 9H2v6h4l5 4z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9.5 9.5 0 0 1 0 13" /></Glyph>
export const X: Icon = (p) => <Glyph {...p}><path d="M6 6l12 12M18 6L6 18" /></Glyph>
export const XCircle: Icon = (p) => <Glyph {...p}><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></Glyph>
