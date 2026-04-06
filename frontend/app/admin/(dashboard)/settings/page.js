'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/contexts/AuthContext'
import {
  Settings,
  Clock,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'

const DEFAULT_SESSION_TIMEOUT = 30
const DEFAULT_REFUND_FEE_TYPE = 'percent'
const DEFAULT_REFUND_FEE_VALUE = 0

const SESSION_TIMEOUT_OPTIONS = [
  { value: 15, label: '15分' },
  { value: 30, label: '30分' },
  { value: 60, label: '1時間' },
  { value: 120, label: '2時間' },
  { value: 240, label: '4時間' },
  { value: 480, label: '8時間' },
]

const REFUND_FEE_TYPE_OPTIONS = [
  { value: 'percent', label: '割合（%）' },
  { value: 'fixed', label: '固定額（円）' },
]

const normalizeSettingValue = (value) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  }
  return value
}

export default function SettingsPage() {
  const { staff, hasPermission } = useAuth()
  const [settings, setSettings] = useState({
    sessionTimeout: DEFAULT_SESSION_TIMEOUT,
    refundFeeType: DEFAULT_REFUND_FEE_TYPE,
    refundFeeValue: DEFAULT_REFUND_FEE_VALUE,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  // 権限管理に基づいて設定変更権限を確認（settings権限を持つユーザーのみ編集可能）
  const canEditSettings = hasPermission('settings', 'view')

  // データベースから設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [sessionRes, refundTypeRes, refundValueRes] = await Promise.all([
          fetch('/api/system-settings?key=session_timeout_minutes'),
          fetch('/api/system-settings?key=refund_fee_type'),
          fetch('/api/system-settings?key=refund_fee_value'),
        ])

        const sessionData = await sessionRes.json()
        const refundTypeData = await refundTypeRes.json()
        const refundValueData = await refundValueRes.json()

        const sessionValue = normalizeSettingValue(sessionData.setting?.value)
        const refundFeeType = normalizeSettingValue(refundTypeData.setting?.value)
        const refundFeeValue = normalizeSettingValue(refundValueData.setting?.value)

        if (sessionValue !== null) {
          const parsed = parseInt(sessionValue, 10)
          if (!isNaN(parsed) && parsed > 0) {
            setSettings(prev => ({ ...prev, sessionTimeout: parsed }))
          }
        }

        setSettings(prev => ({
          ...prev,
          refundFeeType: refundFeeType || DEFAULT_REFUND_FEE_TYPE,
          refundFeeValue: Number.isFinite(Number(refundFeeValue))
            ? Number(refundFeeValue)
            : DEFAULT_REFUND_FEE_VALUE,
        }))
      } catch (err) {
        console.error('Failed to load settings:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    if (!canEditSettings) {
      setError('設定の変更権限がありません')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const payloads = [
        { key: 'session_timeout_minutes', value: settings.sessionTimeout.toString() },
        { key: 'refund_fee_type', value: settings.refundFeeType },
        { key: 'refund_fee_value', value: settings.refundFeeValue },
      ]

      for (const payload of payloads) {
        const res = await fetch('/api/system-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || '保存に失敗しました')
        }
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSettings({
      sessionTimeout: DEFAULT_SESSION_TIMEOUT,
      refundFeeType: DEFAULT_REFUND_FEE_TYPE,
      refundFeeValue: DEFAULT_REFUND_FEE_VALUE,
    })
    if (canEditSettings) {
      await handleSave()
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Settings className="w-7 h-7" />
          設定
        </h1>
        <p className="text-gray-400 mt-1">管理画面の各種設定（全スタッフ共通）</p>
      </div>

      {/* 保存通知 */}
      {saved && (
        <div className="mb-6 p-4 bg-green-900/50 border border-green-500/50 rounded-lg flex items-center gap-3 text-green-400">
          <CheckCircle className="w-5 h-5" />
          設定を保存しました（全スタッフに適用されます）
        </div>
      )}

      {/* エラー通知 */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* 権限警告 */}
      {!canEditSettings && (
        <div className="mb-6 p-4 bg-yellow-900/50 border border-yellow-500/50 rounded-lg flex items-center gap-3 text-yellow-400">
          <AlertCircle className="w-5 h-5" />
          設定の変更権限がありません。現在の設定を確認できます。
        </div>
      )}

      {/* セキュリティ設定 */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-400" />
          セキュリティ設定
        </h2>

        <div className="space-y-6">
          {/* セッションタイムアウト */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              自動ログアウト時間
            </label>
            <p className="text-sm text-gray-500 mb-3">
              操作がない場合、指定時間後に自動的にログアウトされます。
            </p>
            <select
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value, 10) })}
              disabled={!canEditSettings}
              className={`w-full max-w-xs px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                !canEditSettings ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {SESSION_TIMEOUT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              ※ ログアウト5分前に警告が表示されます
            </p>
          </div>
        </div>
      </div>

      {/* 返金設定 */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-400" />
          返金手数料設定
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              手数料の種別
            </label>
            <select
              value={settings.refundFeeType}
              onChange={(e) => setSettings({ ...settings, refundFeeType: e.target.value })}
              disabled={!canEditSettings}
              className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                !canEditSettings ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              {REFUND_FEE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              手数料の値
            </label>
            <input
              type="number"
              min="0"
              value={settings.refundFeeValue}
              onChange={(e) => setSettings({ ...settings, refundFeeValue: Number(e.target.value) })}
              disabled={!canEditSettings}
              className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                !canEditSettings ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            <p className="text-xs text-gray-500 mt-2">
              割合の場合は％、固定額の場合は円で入力します
            </p>
          </div>
        </div>
      </div>

      {/* ボタン */}
      {canEditSettings && (
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
      )}

      {/* 注意事項 */}
      <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <h3 className="text-sm font-medium text-gray-300 mb-2">設定について</h3>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• この設定は全スタッフに適用されます</li>
          <li>• 設定変更は権限管理で許可されたロールのみ可能です</li>
          <li>• 変更後、各スタッフは次回操作時から新しい設定が適用されます</li>
          <li>• セッションタイムアウトはセキュリティのため推奨される設定です</li>
        </ul>
      </div>
    </div>
  )
}
