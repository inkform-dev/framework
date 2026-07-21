import type { ReactNode } from 'react';
import type { AiToolId } from '@inkform/framework/ai-tool-menu';
import {
  Book,
  BookOpen,
  Rocket,
  Terminal,
  Type,
  Code,
  Image,
  Blocks,
  Map,
  Github,
  Pencil,
  Eye,
  Zap,
  Palette,
  FileText,
  Settings,
  Globe,
  Lock,
  Key,
  Database,
  Cloud,
  Mail,
  User,
  Users,
  Star,
  Heart,
  Bell,
  Search,
  Home,
  Layout,
  Package,
  Layers,
  Link,
  ChevronRight,
  Play,
  Download,
  Upload,
  Copy,
  MessageCircle,
  Sparkles,
  MousePointer2,
  Code2,
  Bot,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  book: Book,
  'book-open': BookOpen,
  rocket: Rocket,
  terminal: Terminal,
  type: Type,
  code: Code,
  image: Image,
  blocks: Blocks,
  map: Map,
  github: Github,
  pencil: Pencil,
  eye: Eye,
  zap: Zap,
  palette: Palette,
  file: FileText,
  'file-text': FileText,
  settings: Settings,
  globe: Globe,
  lock: Lock,
  key: Key,
  database: Database,
  cloud: Cloud,
  mail: Mail,
  user: User,
  users: Users,
  star: Star,
  heart: Heart,
  bell: Bell,
  search: Search,
  home: Home,
  layout: Layout,
  package: Package,
  layers: Layers,
  link: Link,
  'chevron-right': ChevronRight,
  play: Play,
  download: Download,
  upload: Upload,
};

/**
 * Map a docs.json icon name to a Lucide icon ReactNode.
 * Returns null for unknown or empty names.
 */
export function renderIcon(name?: string): ReactNode {
  if (!name) return null;
  const Icon = ICON_MAP[name.toLowerCase()];
  if (!Icon) return null;
  return <Icon size={16} strokeWidth={1.75} />;
}

const AI_TOOL_ICON_MAP: Record<AiToolId, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  copy: Copy,
  chatgpt: MessageCircle,
  claude: Sparkles,
  cursor: MousePointer2,
  vscode: Code2,
  perplexity: Search,
  grok: Bot,
};

/**
 * Icon map for <AiToolMenu icons={...} /> (@inkform/framework/ai-tool-menu).
 * A plain ReactNode map, not a callback — AiToolMenu is a Client Component,
 * and a live function can't cross the Server -> Client boundary from this
 * (server-rendered) page. Resolved once, server-side, same convention as
 * Sidebar/DocsShell's own renderIcon. Every icon here is a generic Lucide
 * glyph chosen for its concept (chat, search, editor, cursor, robot) —
 * deliberately NOT a reproduction of any tool's actual logo/brand mark.
 */
export const AI_TOOL_ICONS: Record<AiToolId, ReactNode> = Object.fromEntries(
  (Object.keys(AI_TOOL_ICON_MAP) as AiToolId[]).map((tool) => {
    const Icon = AI_TOOL_ICON_MAP[tool];
    return [tool, <Icon key={tool} size={15} strokeWidth={1.75} />];
  }),
) as Record<AiToolId, ReactNode>;
