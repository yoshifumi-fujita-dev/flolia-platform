'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Check,
  X,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '@/lib/contexts/AuthContext'

// 機能セクション定義
const FEATURE_SECTIONS = [
  {
    key: 'operation',
    label: '運営メニュー',
    description: '日常の店舗運営に必要な機能',
    color: 'bg-blue-600',
  },
  {
    key: 'system_admin',
    label: 'システム管理者メニュー',
    description: 'システム全体の設定・管理機能',
    color: 'bg-rose-600',
  },
]

// 機能一覧（表示順）
// ※ permissions（権限管理）はSuper Admin専用のため、マトリックスには表示しない
const FEATURES = [
  // 運営メニュー
  { key: 'top', label: 'トップ', section: 'operation' },
  { key: 'dashboard', label: 'ダッシュボード', section: 'operation' },
  { key: 'inquiries', label: 'LINEお問い合わせ', section: 'operation' },
  { key: 'announcements', label: 'お知らせ配信', section: 'operation' },
  { key: 'bookings', label: '予約管理', section: 'operation' },
  { key: 'instructors', label: 'インストラクター', section: 'operation' },
  { key: 'schedules', label: '休講・代行管理', section: 'operation' },
  { key: 'substitute_requests', label: '代行募集', section: 'operation' },
  { key: 'classes', label: 'クラス・スケジュール', section: 'operation' },
  { key: 'members', label: '会員管理', section: 'operation' },
  { key: 'attendance', label: '入退館ログ', section: 'operation' },
  { key: 'products', label: '商品管理', section: 'operation' },
  { key: 'refunds', label: '返金管理', section: 'operation' },
  { key: 'instructor_messages', label: 'インストラクターメッセージ', section: 'operation' },
  { key: 'testimonials', label: 'お客様の声編集', section: 'operation' },
  // システム管理者メニュー
  { key: 'stores', label: '店舗管理', section: 'system_admin' },
  { key: 'plans', label: '料金プラン', section: 'system_admin' },
  { key: 'site_media', label: 'サイトメディア', section: 'system_admin' },
  { key: 'facilities', label: '設備管理', section: 'system_admin' },
  { key: 'payments', label: '売上・決済', section: 'system_admin' },
  { key: 'staff', label: '従業員管理', section: 'system_admin' },
  { key: 'contracts', label: '契約書テンプレート', section: 'system_admin' },
  { key: 'instructor_attendances', label: '勤怠管理', section: 'system_admin' },
  { key: 'instructor_payroll', label: 'インストラクター給与', section: 'system_admin' },
  { key: 'staff_attendances', label: 'スタッフ勤怠', section: 'system_admin' },
  { key: 'expenses', label: '経費管理', section: 'system_admin' },
  { key: 'mf_export', label: 'MFクラウド連携', section: 'system_admin' },
  { key: 'partner_offers', label: 'ジムコネ', section: 'system_admin' },
  { key: 'partner_reports', label: 'ジムコネレポート', section: 'system_admin' },
  // { key: 'permissions', label: '権限管理' }, // Super Admin専用 - マトリックスから除外
  { key: 'line_notifications', label: 'LINE通知設定', section: 'system_admin' },
  { key: 'faqs', label: 'よくあるご質問編集', section: 'system_admin' },
  { key: 'careers', label: '採用情報編集', section: 'system_admin' },
  { key: 'legal', label: '法務ページ', section: 'system_admin' },
  { key: 'analytics', label: 'アクセス解析', section: 'system_admin' },
  { key: 'audit_logs', label: '監査ログ', section: 'system_admin' },
  { key: 'settings', label: '設定', section: 'system_admin' },
]

// ロールの色設定（動的ロール用のフォールバック含む）
const ROLE_COLORS = {
  // スペース入りの名前（データベースの実際の値）
  'Super Admin': { bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-400' },
  'System Developer': { bg: 'bg-yellow-600', hover: 'hover:bg-yellow-700', text: 'text-yellow-400' },
  'Area Manager': { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-400' },
  // スネークケースの名前（互換性のため）
  super_admin: { bg: 'bg-rose-600', hover: 'hover:bg-rose-700', text: 'text-rose-400' },
  system_developer: { bg: 'bg-yellow-600', hover: 'hover:bg-yellow-700', text: 'text-yellow-400' },
  admin: { bg: 'bg-violet-600', hover: 'hover:bg-violet-700', text: 'text-violet-400' },
  area_manager: { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-indigo-400' },
  store_manager: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-400' },
  receptionist: { bg: 'bg-green-600', hover: 'hover:bg-green-700', text: 'text-green-400' },
  instructor: { bg: 'bg-pink-600', hover: 'hover:bg-pink-700', text: 'text-pink-400' },
  Instructor: { bg: 'bg-pink-600', hover: 'hover:bg-pink-700', text: 'text-pink-400' },
  part_time: { bg: 'bg-teal-600', hover: 'hover:bg-teal-700', text: 'text-teal-400' },
  default: { bg: 'bg-gray-600', hover: 'hover:bg-gray-700', text: 'text-gray-400' },
}

// ロールの色を取得
const getRoleColor = (roleName) => {
  return ROLE_COLORS[roleName] || ROLE_COLORS.default
}

// デフォルトの権限マトリックス
const DEFAULT_PERMISSIONS = {
  // 運営メニュー
  top: ['admin', 'store_manager', 'receptionist'],
  dashboard: ['admin', 'store_manager'],
  inquiries: ['admin', 'store_manager', 'receptionist'],
  announcements: ['admin', 'store_manager', 'receptionist'],
  bookings: ['admin', 'store_manager', 'receptionist'],
  schedules: ['admin', 'store_manager'],
  substitute_requests: ['admin', 'store_manager', 'instructor'],
  classes: ['admin', 'store_manager'],
  members: ['admin', 'store_manager', 'receptionist'],
  attendance: ['admin', 'store_manager', 'receptionist'],
  products: ['admin', 'store_manager'],
  refunds: ['admin', 'store_manager', 'receptionist', 'instructor', 'area_manager', 'super_admin'],
  instructor_messages: ['admin', 'store_manager'],
  payments: ['admin'],
  testimonials: ['admin', 'store_manager', 'receptionist'],
  // システム管理者メニュー
  stores: ['admin'],
  plans: ['admin'],
  site_media: ['admin'],
  facilities: ['admin'],
  staff: ['admin'],
  contracts: ['admin'],
  instructors: ['admin', 'store_manager', 'receptionist'],
  instructor_attendances: ['admin', 'store_manager'],
  instructor_payroll: ['admin'],
  staff_attendances: ['admin', 'store_manager'],
  expenses: ['admin'],
  mf_export: ['admin'],
  partner_offers: ['admin'],
  partner_reports: ['admin'],
  // permissions: Super Admin専用 - マトリックスで管理しない
  line_notifications: ['admin'],
  faqs: ['admin'],
  careers: ['admin'],
  legal: ['admin'],
  analytics: ['admin'],
  audit_logs: ['admin'],
  settings: ['admin'],
}

export default function PermissionsPage() {
  const router = useRouter()
  const { staff, loading: authLoading } = useAuth()
  // Super Adminのみ権限管理画面にアクセス・編集可能
  const isSuperAdmin = staff?.roles?.name === 'Super Admin'
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDisplayName, setNewRoleDisplayName] = useState('')
  const [editingRoleId, setEditingRoleId] = useState(null)
  const [editRoleName, setEditRoleName] = useState('')
  const [editRoleDisplayName, setEditRoleDisplayName] = useState('')
  const [editRoleSortOrder, setEditRoleSortOrder] = useState(0)
  const [newRoleSortOrder, setNewRoleSortOrder] = useState(0)
  const [roleActionLoading, setRoleActionLoading] = useState(false)

  // 権限データの読み込み
  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      fetchRoles()
    }
  }, [authLoading, isSuperAdmin])

  // 権限がない場合はアクセス不可
  if (authLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-8 text-center">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">アクセス権限がありません</h1>
          <p className="text-gray-400 mb-6">
            権限管理はシステム管理者（Super Admin）のみアクセス可能です。
          </p>
          <button
            onClick={() => router.push('/backoffice/top')}
            className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            トップに戻る
          </button>
        </div>
      </div>
    )
  }

  const fetchRoles = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/roles')
      const data = await res.json()

      if (data.error) throw new Error(data.error)

      // sort_orderでソート
      const sortedRoles = (data.roles || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      setRoles(sortedRoles)

      // 権限マトリックスを構築
      const permMatrix = {}
      FEATURES.forEach((feature) => {
        permMatrix[feature.key] = []
        data.roles.forEach((role) => {
          if (role.permissions?.[feature.key]?.view) {
            permMatrix[feature.key].push(role.name)
          }
        })
      })
      setPermissions(permMatrix)
    } catch (err) {
      console.error('Failed to fetch roles:', err)
      setError('権限データの取得に失敗しました')
      // デフォルト値を使用
      setPermissions(DEFAULT_PERMISSIONS)
    } finally {
      setLoading(false)
    }
  }

  // 権限の切り替え
  const togglePermission = (featureKey, roleName) => {
    setPermissions((prev) => {
      const current = prev[featureKey] || []
      const newPerms = current.includes(roleName)
        ? current.filter((r) => r !== roleName)
        : [...current, roleName]
      return { ...prev, [featureKey]: newPerms }
    })
  }

  // 保存
  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      // 各ロールの権限を更新
      for (const role of roles) {
        const rolePermissions = {}

        FEATURES.forEach((feature) => {
          const hasAccess = permissions[feature.key]?.includes(role.name)
          if (hasAccess) {
            rolePermissions[feature.key] = { view: true }
            // 管理者は全権限
            if (role.name === 'admin') {
              rolePermissions[feature.key] = {
                view: true,
                create: true,
                edit: true,
                delete: true,
                send: feature.key === 'announcements',
              }
            }
          }
        })

        const res = await fetch(`/api/roles/${role.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...role,
            permissions: rolePermissions,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || '保存に失敗しました')
        }
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Failed to save:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // 初期値に戻す
  const handleReset = () => {
    setPermissions(DEFAULT_PERMISSIONS)
  }

  // 権限があるかチェック
  const hasPermission = (featureKey, roleName) => {
    return permissions[featureKey]?.includes(roleName)
  }

  // ロールの編集開始
  const handleStartEdit = (role) => {
    setEditingRoleId(role.id)
    setEditRoleName(role.name)
    setEditRoleDisplayName(role.display_name)
    setEditRoleSortOrder(role.sort_order || 0)
  }

  // ロールの更新
  const handleUpdateRole = async (roleId) => {
    if (!editRoleName || !editRoleDisplayName) return

    try {
      setRoleActionLoading(true)
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editRoleName,
          display_name: editRoleDisplayName,
          sort_order: editRoleSortOrder,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '更新に失敗しました')
      }

      setEditingRoleId(null)
      fetchRoles()
    } catch (err) {
      console.error('Failed to update role:', err)
      setError(err.message)
    } finally {
      setRoleActionLoading(false)
    }
  }

  // ロールの追加
  const handleAddRole = async () => {
    if (!newRoleName || !newRoleDisplayName) return

    try {
      setRoleActionLoading(true)
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRoleName,
          display_name: newRoleDisplayName,
          sort_order: newRoleSortOrder || roles.length,
          permissions: {},
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '追加に失敗しました')
      }

      setNewRoleName('')
      setNewRoleDisplayName('')
      setNewRoleSortOrder(0)
      fetchRoles()
    } catch (err) {
      console.error('Failed to add role:', err)
      setError(err.message)
    } finally {
      setRoleActionLoading(false)
    }
  }

  // ロールの削除
  const handleDeleteRole = async (roleId) => {
    if (!confirm('このロールを削除しますか？')) return

    try {
      setRoleActionLoading(true)
      const res = await fetch(`/api/roles/${roleId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '削除に失敗しました')
      }

      fetchRoles()
    } catch (err) {
      console.error('Failed to delete role:', err)
      setError(err.message)
    } finally {
      setRoleActionLoading(false)
    }
  }

  // 並び順を上に移動
  const handleMoveUp = async (index) => {
    if (index === 0) return
    const newRoles = [...roles]
    const temp = newRoles[index - 1]
    newRoles[index - 1] = newRoles[index]
    newRoles[index] = temp

    // sort_orderを更新
    try {
      setRoleActionLoading(true)
      await Promise.all([
        fetch(`/api/roles/${newRoles[index - 1].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: index - 1 }),
        }),
        fetch(`/api/roles/${newRoles[index].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: index }),
        }),
      ])
      fetchRoles()
    } catch (err) {
      console.error('Failed to move role:', err)
      setError('並び順の変更に失敗しました')
    } finally {
      setRoleActionLoading(false)
    }
  }

  // 並び順を下に移動
  const handleMoveDown = async (index) => {
    if (index === roles.length - 1) return
    const newRoles = [...roles]
    const temp = newRoles[index + 1]
    newRoles[index + 1] = newRoles[index]
    newRoles[index] = temp

    // sort_orderを更新
    try {
      setRoleActionLoading(true)
      await Promise.all([
        fetch(`/api/roles/${newRoles[index].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: index }),
        }),
        fetch(`/api/roles/${newRoles[index + 1].id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: index + 1 }),
        }),
      ])
      fetchRoles()
    } catch (err) {
      console.error('Failed to move role:', err)
      setError('並び順の変更に失敗しました')
    } finally {
      setRoleActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="w-7 h-7" />
          権限管理
        </h1>
        <p className="text-gray-400 mt-1">機能ごとにアクセス権限を設定します</p>
      </div>

      {/* 通知 */}
      {saved && (
        <div className="mb-6 p-4 bg-green-900/50 border border-green-500/50 rounded-lg flex items-center gap-3 text-green-400">
          <CheckCircle className="w-5 h-5" />
          権限設定を保存しました
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* 権限マトリックス */}
      <div className="bg-gray-800 rounded-xl overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="w-8"></th>
                <th className="text-left py-4 px-4 text-gray-300 font-medium w-48">
                  機能
                </th>
                {roles.map((role) => {
                  const color = getRoleColor(role.name)
                  return (
                    <th key={role.id} className="text-center py-4 px-3 text-gray-300 font-medium min-w-[120px]">
                      <div className="flex flex-col items-center">
                        <span className={color.text}>{role.display_name}</span>
                        <span className="text-xs text-gray-500">{role.name}</span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {FEATURE_SECTIONS.map((section) => {
                const sectionFeatures = FEATURES.filter(f => f.section === section.key)
                return (
                  <Fragment key={section.key}>
                    {/* セクション内の機能（左側に縦書きラベル） */}
                    {sectionFeatures.map((feature, index) => (
                      <tr
                        key={feature.key}
                        className={`border-b border-gray-700/50 ${
                          index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-800/50'
                        }`}
                      >
                        {/* セクションラベル（縦書き、最初の行のみrowSpanで表示） */}
                        {index === 0 && (
                          <td
                            rowSpan={sectionFeatures.length}
                            className={`${section.color} relative w-8`}
                          >
                            <div
                              className="absolute inset-0 flex items-center justify-center"
                              style={{ writingMode: 'vertical-rl' }}
                            >
                              <span className="text-white font-bold text-sm tracking-wider whitespace-nowrap">
                                {section.label}
                              </span>
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-4 text-white font-medium">
                          {feature.label}
                        </td>
                        {roles.map((role) => {
                          const color = getRoleColor(role.name)
                          const hasPerm = hasPermission(feature.key, role.name)
                          return (
                            <td key={role.id} className="py-3 px-3">
                              <div className="flex justify-center">
                                <button
                                  onClick={() => togglePermission(feature.key, role.name)}
                                  className={`
                                    w-10 h-10 rounded-lg flex items-center justify-center transition-all
                                    ${
                                      hasPerm
                                        ? `${color.bg} text-white ${color.hover}`
                                        : 'bg-gray-700 text-gray-500 hover:bg-gray-600'
                                    }
                                  `}
                                >
                                  {hasPerm ? (
                                    <Check className="w-5 h-5" />
                                  ) : (
                                    <X className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ボタン */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          保存
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          初期値に戻す
        </button>
      </div>

      {/* 権限グループ管理 */}
      <div className="mt-8 bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          権限グループ管理
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          権限グループを追加・編集・削除できます。グループを追加すると、上の権限マトリックスに列が追加されます。
        </p>

        {/* 既存のロール一覧 */}
        <div className="space-y-2 mb-6">
          {roles.map((role, index) => {
            const color = getRoleColor(role.name)
            const isEditing = editingRoleId === role.id

            if (isEditing) {
              return (
                <div key={role.id} className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg">
                  <input
                    type="text"
                    value={editRoleName}
                    onChange={(e) => setEditRoleName(e.target.value)}
                    placeholder="システム名（例: area_manager）"
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  />
                  <input
                    type="text"
                    value={editRoleDisplayName}
                    onChange={(e) => setEditRoleDisplayName(e.target.value)}
                    placeholder="表示名（例: エリアマネージャー）"
                    className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                  />
                  <button
                    onClick={() => handleUpdateRole(role.id)}
                    disabled={roleActionLoading}
                    className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {roleActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditingRoleId(null)}
                    className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            }

            return (
              <div key={role.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {/* 並び順ボタン */}
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || roleActionLoading}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === roles.length - 1 || roleActionLoading}
                      className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-gray-500 text-sm w-6 text-center">{index + 1}</span>
                  <div className={`w-3 h-3 rounded-full ${color.bg}`} />
                  <span className="text-white font-medium">{role.display_name}</span>
                  <span className="text-gray-500 text-sm">({role.name})</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartEdit(role)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {role.name !== 'admin' && (
                    <button
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={roleActionLoading}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 新規追加フォーム */}
        <div className="border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新規グループを追加
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="システム名（例: area_manager）"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-500"
            />
            <input
              type="text"
              value={newRoleDisplayName}
              onChange={(e) => setNewRoleDisplayName(e.target.value)}
              placeholder="表示名（例: エリアマネージャー）"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-500"
            />
            <button
              onClick={handleAddRole}
              disabled={roleActionLoading || !newRoleName || !newRoleDisplayName}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {roleActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              追加
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
