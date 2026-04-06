'use client'

import Link from 'next/link'
import NextImage from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Calendar,
  Users,
  BookOpen,
  CreditCard,
  Bell,
  LogOut,
  Menu,
  X,
  Tag,
  Store,
  LayoutDashboard,
  Clock,
  FileText,
  UserCog,
  Settings,
  Image,
  Building2,
  MessageSquareQuote,
  HelpCircle,
  Shield,
  Home,
  DoorOpen,
  MessageCircle,
  BarChart3,
  ClipboardCheck,
  DollarSign,
  ShoppingBag,
  Hand,
  Send,
  Briefcase,
  Scale,
  Receipt,
  FileDown,
  Tablet,
  Gift,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/contexts/AuthContext'

// 運営メニュー項目
const operationMenuItems = [
  { href: '/backoffice/top', label: 'トップ', icon: Home },
  { href: '/backoffice/dashboard', label: 'ダッシュボード', icon: LayoutDashboard, permission: { resource: 'dashboard', action: 'view' } },
  { href: '/backoffice/tablet-manual', label: 'タブレット操作マニュアル', icon: Tablet },
  { href: '/backoffice/inquiries', label: 'LINEお問い合わせ', icon: MessageCircle, permission: { resource: 'inquiries', action: 'view' } },
  { href: '/backoffice/announcements', label: 'お知らせ編集', icon: Bell, permission: { resource: 'announcements', action: 'view' } },
  { href: '/backoffice/bookings', label: '予約管理', icon: Calendar, permission: { resource: 'bookings', action: 'view' } },
  { href: '/backoffice/schedules', label: '休講・代行管理', icon: Clock, permission: { resource: 'schedules', action: 'view' } },
  { href: '/backoffice/substitute-requests', label: '代行募集', icon: Hand, permission: { resource: 'schedules', action: 'view' } },
  { href: '/backoffice/classes', label: 'クラス・スケジュール', icon: BookOpen, permission: { resource: 'classes', action: 'view' } },
  { href: '/backoffice/members', label: '会員管理', icon: Users, permission: { resource: 'members', action: 'view' } },
  { href: '/backoffice/attendance', label: '入退館ログ', icon: DoorOpen, permission: { resource: 'members', action: 'view' } },
  { href: '/backoffice/products', label: '商品管理', icon: ShoppingBag, permission: { resource: 'stores', action: 'view' } },
  { href: '/backoffice/refunds', label: '返金管理', icon: DollarSign, permission: { resource: 'refunds', action: 'view' } },
  { href: '/backoffice/instructor-messages', label: 'インストラクターメッセージ', icon: Send, permission: { resource: 'announcements', action: 'view' } },
  { href: '/backoffice/testimonials', label: 'お客様の声編集', icon: MessageSquareQuote, permission: { resource: 'announcements', action: 'view' } },
  { href: '/backoffice/faqs', label: 'よくあるご質問編集', icon: HelpCircle, permission: { resource: 'announcements', action: 'edit' } },
]

// システム管理者メニュー項目（adminOnly）
// ※ インストラクター管理は従業員管理に統合済み
const adminMenuItems = [
  { href: '/backoffice/stores', label: '店舗管理', icon: Store },
  { href: '/backoffice/plans', label: '料金プラン', icon: Tag },
  { href: '/backoffice/stores/media', label: 'サイトメディア', icon: Image },
  { href: '/backoffice/facilities', label: '設備管理', icon: Building2 },
  { href: '/backoffice/payments', label: '売上・決済', icon: CreditCard },
  { href: '/backoffice/staff', label: '従業員管理', icon: UserCog },
  { href: '/backoffice/contracts', label: '契約書テンプレート', icon: FileText },
  { href: '/backoffice/staff-attendances', label: 'スタッフ勤怠', icon: ClipboardCheck },
  { href: '/backoffice/expenses', label: '経費管理', icon: Receipt },
  { href: '/backoffice/mf-export', label: 'MFクラウド連携', icon: FileDown },
  { href: '/backoffice/partner-offers', label: 'ジムコネ', icon: Gift },
  { href: '/backoffice/partner-reports', label: 'ジムコネレポート', icon: BarChart3 },
  { href: '/backoffice/permissions', label: '権限管理', icon: Shield },
  { href: '/backoffice/line-notifications', label: 'LINE通知設定', icon: MessageCircle },
  { href: '/backoffice/careers', label: '採用情報編集', icon: Briefcase },
  { href: '/backoffice/legal', label: '法務ページ', icon: Scale },
  { href: '/backoffice/analytics', label: 'アクセス解析', icon: BarChart3 },
  { href: '/backoffice/audit-logs', label: '監査ログ', icon: FileText },
  { href: '/backoffice/settings', label: '設定', icon: Settings },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { isAdmin, hasPermission, menuMode, setMenuMode } = useAuth()

  // モード切り替え時に最初のメニューに遷移
  const handleModeChange = (mode) => {
    setMenuMode(mode)
    // 切り替え先のメニューの最初の項目に遷移
    const targetMenuItems = mode === 'admin' ? adminMenuItems : operationMenuItems
    if (targetMenuItems.length > 0) {
      router.push(targetMenuItems[0].href)
    }
  }

  // メニューモードに応じてメニュー項目を選択し、権限でフィルタリング
  const baseMenuItems = isAdmin && menuMode === 'admin' ? adminMenuItems : operationMenuItems

  const menuItems = baseMenuItems.filter(item => {
    // permissionがない項目は表示
    if (!item.permission) return true

    // permission指定がある場合は権限チェック（管理者は全て許可）
    return isAdmin || hasPermission(item.permission.resource, item.permission.action)
  })

  const handleLogout = async () => {
    try {
      // ログアウトAPIを呼び出し（監査ログ記録のため）
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout error:', error)
    }
    // クライアント側でもサインアウト
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/backoffice/login'
  }

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-gray-700">
        <Link href="/backoffice/top">
          <NextImage src="/logo.png" alt="FLOLIA" width={150} height={48} className="h-12 w-auto" />
        </Link>
      </div>

      {/* Menu Mode Toggle (管理者のみ) */}
      {isAdmin && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex rounded-lg bg-gray-700/50 p-1">
            <button
              onClick={() => handleModeChange('operation')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                menuMode === 'operation'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              運営
            </button>
            <button
              onClick={() => handleModeChange('admin')}
              className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                menuMode === 'admin'
                  ? 'bg-violet-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              管理者
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            // パスの完全一致、または子パスの場合もアクティブにする
            // ただし /backoffice/stores と /backoffice/stores/media は別々に扱う
            const isActive = pathname === item.href ||
              (item.href !== '/backoffice/stores' && pathname.startsWith(item.href + '/'))
            const Icon = item.icon
            // 運営メニューは緑、管理者メニューは紫
            const activeColor = menuMode === 'operation' ? 'bg-green-600' : 'bg-violet-600'
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center px-3 py-2.5 rounded-lg transition-colors
                    ${isActive
                      ? `${activeColor} text-white font-medium`
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'}
                  `}
                >
                  <span className="w-5 h-5 flex-shrink-0 mr-3 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>ログアウト</span>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center justify-between p-4">
          <Link href="/backoffice/top">
            <NextImage src="/logo.png" alt="FLOLIA" width={120} height={40} className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            {/* ハンバーガーメニュー */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-gray-700 rounded-lg text-gray-300"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-200
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full pt-4">
          <NavContent />
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gray-800 border-r border-gray-700">
        <NavContent />
      </aside>
    </>
  )
}
