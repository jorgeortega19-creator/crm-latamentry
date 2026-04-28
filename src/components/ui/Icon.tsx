'use client'

import {
  LayoutDashboard, GitBranch, Users, Inbox, BarChart3, Settings,
  Bell, Search, Plus, X, ChevronRight, ArrowRight, MoreHorizontal,
  Building2, Mail, Phone, Globe, Calendar, TrendingUp, DollarSign,
  Target, Award, ChevronDown, ChevronUp, Filter, Download, Trash2,
  Edit2, Eye, Check, AlertCircle, Clock, MessageSquare, Paperclip,
  CheckSquare, FileText, Send, Star, Grip, Move, ArrowUpRight,
  LogOut, User, Shield, Layers, Zap, Activity, Package,
} from 'lucide-react'

const icons = {
  dashboard: LayoutDashboard,
  pipeline: GitBranch,
  contacts: Users,
  inbox: Inbox,
  reports: BarChart3,
  settings: Settings,
  bell: Bell,
  search: Search,
  plus: Plus,
  x: X,
  'chevron-right': ChevronRight,
  'arrow-right': ArrowRight,
  more: MoreHorizontal,
  building: Building2,
  mail: Mail,
  phone: Phone,
  globe: Globe,
  calendar: Calendar,
  'trending-up': TrendingUp,
  dollar: DollarSign,
  target: Target,
  award: Award,
  'chevron-down': ChevronDown,
  'chevron-up': ChevronUp,
  filter: Filter,
  download: Download,
  trash: Trash2,
  edit: Edit2,
  eye: Eye,
  check: Check,
  alert: AlertCircle,
  clock: Clock,
  message: MessageSquare,
  paperclip: Paperclip,
  task: CheckSquare,
  file: FileText,
  send: Send,
  star: Star,
  grip: Grip,
  move: Move,
  'arrow-up-right': ArrowUpRight,
  logout: LogOut,
  user: User,
  shield: Shield,
  layers: Layers,
  zap: Zap,
  activity: Activity,
  package: Package,
} as const

type IconName = keyof typeof icons

interface IconProps {
  name: IconName
  size?: number
  color?: string
  className?: string
}

export default function Icon({ name, size = 16, color, className }: IconProps) {
  const Comp = icons[name]
  if (!Comp) return null
  return <Comp size={size} color={color} className={className} strokeWidth={1.75}/>
}
