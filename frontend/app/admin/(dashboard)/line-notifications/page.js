'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Bell,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  X,
  Gift,
  Calendar,
  Users,
  Trophy,
  Heart,
  CreditCard,
  Clock,
  CheckCircle,
  ToggleLeft,
  ToggleRight,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'

// トリガー種別のアイコンと色
const TRIGGER_CONFIG = {
  birthday: { icon: Calendar, color: 'bg-pink-600', label: '誕生日' },
  membership_anniversary: { icon: Trophy, color: 'bg-yellow-600', label: '入会記念日' },
  weekly_visit_count: { icon: Users, color: 'bg-blue-600', label: '週間来店' },
  monthly_visit_count: { icon: Users, color: 'bg-cyan-600', label: '月間来店' },
  total_visit_count: { icon: Trophy, color: 'bg-violet-600', label: '通算来店' },
  return_after_absence: { icon: Heart, color: 'bg-green-600', label: '久しぶり来店' },
  paused_member_followup: { icon: Heart, color: 'bg-orange-600', label: '休会者フォロー' },
  payment_completed: { icon: CreditCard, color: 'bg-emerald-600', label: '決済完了' },
}

const TRIGGER_TYPE_LABELS = {
  event: { label: 'イベント時', color: 'bg-blue-900/50 text-blue-400' },
  cron: { label: '定期実行', color: 'bg-green-900/50 text-green-400' },
  milestone: { label: '達成時', color: 'bg-yellow-900/50 text-yellow-400' },
}

// 条件設定のフィールド定義
const CONDITION_FIELDS = {
  weekly_visit_count: { key: 'count', label: '週間来店回数', unit: '回目', placeholder: '3' },
  monthly_visit_count: { key: 'count', label: '月間来店回数', unit: '回目', placeholder: '10' },
  total_visit_count: { key: 'count', label: '通算来店回数', unit: '回目', placeholder: '100' },
  return_after_absence: { key: 'days', label: '未来店日数', unit: '日以上', placeholder: '14' },
  membership_anniversary: { key: 'years', label: '経過年数', unit: '年', placeholder: '1' },
  paused_member_followup: { key: 'days', label: '休会後日数', unit: '日経過', placeholder: '30' },
}

export default function LineNotificationsPage() {
  const [templates, setTemplates] = useState([])
  const [triggers, setTriggers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // モーダル状態
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [formData, setFormData] = useState({
    trigger_id: '',
    name: '',
    conditions: {},
    message_template: '',
    reward_name: '',
    reward_description: '',
    reward_valid_days: '',
    is_active: true,
  })

  // 展開されたトリガーカテゴリ
  const [expandedCategories, setExpandedCategories] = useState({})

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [templatesRes, triggersRes] = await Promise.all([
        fetch('/api/line-notifications'),
        fetch('/api/line-notifications/triggers'),
      ])

      if (!templatesRes.ok || !triggersRes.ok) {
        throw new Error('データの取得に失敗しました')
      }

      const [templatesData, triggersData] = await Promise.all([
        templatesRes.json(),
        triggersRes.json(),
      ])

      setTemplates(templatesData)
      setTriggers(triggersData)

      // 最初はすべて展開
      const expanded = {}
      triggersData.forEach(t => { expanded[t.id] = true })
      setExpandedCategories(expanded)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCreateModal = (triggerId = '') => {
    setIsEditing(false)
    setSelectedTemplate(null)
    setFormData({
      trigger_id: triggerId,
      name: '',
      conditions: {},
      message_template: '',
      reward_name: '',
      reward_description: '',
      reward_valid_days: '',
      is_active: true,
    })
    setIsModalOpen(true)
  }

  const openEditModal = (template) => {
    setIsEditing(true)
    setSelectedTemplate(template)
    setFormData({
      trigger_id: template.trigger_id,
      name: template.name,
      conditions: template.conditions || {},
      message_template: template.message_template,
      reward_name: template.reward_name || '',
      reward_description: template.reward_description || '',
      reward_valid_days: template.reward_valid_days || '',
      is_active: template.is_active,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = isEditing
        ? `/api/line-notifications/${selectedTemplate.id}`
        : '/api/line-notifications'
      const method = isEditing ? 'PUT' : 'POST'

      const submitData = {
        ...formData,
        reward_valid_days: formData.reward_valid_days ? parseInt(formData.reward_valid_days) : null,
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error)
      }

      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('このテンプレートを削除してもよろしいですか？')) return

    try {
      const res = await fetch(`/api/line-notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('削除に失敗しました')
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleToggleActive = async (template) => {
    try {
      const res = await fetch(`/api/line-notifications/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !template.is_active }),
      })

      if (!res.ok) throw new Error('更新に失敗しました')
      fetchData()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleCategory = (triggerId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [triggerId]: !prev[triggerId],
    }))
  }

  // トリガー別にテンプレートをグループ化
  const templatesByTrigger = triggers.reduce((acc, trigger) => {
    acc[trigger.id] = templates.filter(t => t.trigger_id === trigger.id)
    return acc
  }, {})

  // 条件フィールドの値を取得
  const getConditionValue = (conditions, triggerId) => {
    const field = CONDITION_FIELDS[triggerId]
    if (!field) return null
    return conditions?.[field.key]
  }

  // 条件の表示文字列を生成
  const formatCondition = (conditions, triggerId) => {
    const field = CONDITION_FIELDS[triggerId]
    if (!field) return ''
    const value = conditions?.[field.key]
    if (!value) return ''
    return `${value}${field.unit}`
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6" />
            LINE通知設定
          </h1>
          <p className="text-gray-400 mt-1">
            来店時や記念日に自動送信されるLINE通知を管理します
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            更新
          </button>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </div>

      {/* 説明 */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-violet-400 mt-0.5" />
          <div className="text-sm text-gray-300">
            <p className="font-medium mb-1">使用可能な変数</p>
            <code className="text-violet-400">{'{name}'}</code> 会員名
            <code className="text-violet-400">{'{count}'}</code> 回数
            <code className="text-violet-400">{'{years}'}</code> 年数
            <code className="text-violet-400">{'{reward}'}</code> 特典名
          </div>
        </div>
      </div>

      {/* エラー */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-400 rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {/* コンテンツ */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : (
        <div className="space-y-4">
          {triggers.map((trigger) => {
            const config = TRIGGER_CONFIG[trigger.id] || {}
            const Icon = config.icon || Bell
            const triggerTemplates = templatesByTrigger[trigger.id] || []
            const isExpanded = expandedCategories[trigger.id]

            return (
              <div key={trigger.id} className="bg-gray-800 rounded-lg overflow-hidden">
                {/* トリガーヘッダー */}
                <button
                  onClick={() => toggleCategory(trigger.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${config.color || 'bg-gray-600'} rounded-lg flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{trigger.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${TRIGGER_TYPE_LABELS[trigger.trigger_type]?.color}`}>
                          {TRIGGER_TYPE_LABELS[trigger.trigger_type]?.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          {triggerTemplates.length}件
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{trigger.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openCreateModal(trigger.id)
                      }}
                      className="p-2 text-violet-400 hover:bg-gray-600 rounded-lg transition-colors"
                      title="このトリガーで追加"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* テンプレート一覧 */}
                {isExpanded && (
                  <div className="border-t border-gray-700">
                    {triggerTemplates.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        テンプレートがありません
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-700">
                        {triggerTemplates.map((template) => (
                          <div
                            key={template.id}
                            className={`p-4 ${!template.is_active ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-white">
                                    {template.name}
                                  </span>
                                  {formatCondition(template.conditions, trigger.id) && (
                                    <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                                      {formatCondition(template.conditions, trigger.id)}
                                    </span>
                                  )}
                                  {template.reward_name && (
                                    <span className="px-2 py-0.5 text-xs bg-yellow-900/50 text-yellow-400 rounded flex items-center gap-1">
                                      <Gift className="w-3 h-3" />
                                      {template.reward_name}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-400 line-clamp-2">
                                  {template.message_template}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-4">
                                <button
                                  onClick={() => handleToggleActive(template)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    template.is_active
                                      ? 'text-green-400 hover:bg-green-900/30'
                                      : 'text-gray-500 hover:bg-gray-700'
                                  }`}
                                  title={template.is_active ? '有効' : '無効'}
                                >
                                  {template.is_active ? (
                                    <ToggleRight className="w-5 h-5" />
                                  ) : (
                                    <ToggleLeft className="w-5 h-5" />
                                  )}
                                </button>
                                <button
                                  onClick={() => openEditModal(template)}
                                  className="p-2 text-gray-400 hover:text-violet-400 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(template.id)}
                                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 作成/編集モーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-gray-700">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">
              {isEditing ? 'テンプレート編集' : '新規テンプレート作成'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* トリガー選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  通知タイミング <span className="text-red-400">*</span>
                </label>
                <select
                  required
                  value={formData.trigger_id}
                  onChange={(e) => setFormData({ ...formData, trigger_id: e.target.value, conditions: {} })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">選択してください</option>
                  {triggers.map((trigger) => (
                    <option key={trigger.id} value={trigger.id}>
                      {trigger.name} - {trigger.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* テンプレート名 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  テンプレート名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例: 100回来店達成"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* 条件設定（トリガーに応じて表示） */}
              {formData.trigger_id && CONDITION_FIELDS[formData.trigger_id] && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {CONDITION_FIELDS[formData.trigger_id].label} <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.conditions[CONDITION_FIELDS[formData.trigger_id].key] || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          [CONDITION_FIELDS[formData.trigger_id].key]: parseInt(e.target.value) || '',
                        },
                      })}
                      placeholder={CONDITION_FIELDS[formData.trigger_id].placeholder}
                      className="w-32 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <span className="text-gray-400">
                      {CONDITION_FIELDS[formData.trigger_id].unit}
                    </span>
                  </div>
                </div>
              )}

              {/* メッセージ */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  メッセージ <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  value={formData.message_template}
                  onChange={(e) => setFormData({ ...formData, message_template: e.target.value })}
                  rows={5}
                  placeholder={`例:\n{name}様、通算{count}回目のご来店ありがとうございます！\n\nささやかですが{reward}をプレゼントいたします。\n受付でスタッフにこの画面をお見せください。`}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  変数: {'{name}'} 会員名, {'{count}'} 回数, {'{years}'} 年数, {'{reward}'} 特典名
                </p>
              </div>

              {/* 特典設定 */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                  <Gift className="w-4 h-4" />
                  特典設定（任意）
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">特典名</label>
                    <input
                      type="text"
                      value={formData.reward_name}
                      onChange={(e) => setFormData({ ...formData, reward_name: e.target.value })}
                      placeholder="例: プロテインドリンク"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">有効期限（日数）</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.reward_valid_days}
                      onChange={(e) => setFormData({ ...formData, reward_valid_days: e.target.value })}
                      placeholder="例: 30"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm text-gray-400 mb-1">特典詳細</label>
                  <input
                    type="text"
                    value={formData.reward_description}
                    onChange={(e) => setFormData({ ...formData, reward_description: e.target.value })}
                    placeholder="例: 受付でお申し出ください"
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* 有効/無効 */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    formData.is_active
                      ? 'bg-green-900/30 border-green-700 text-green-400'
                      : 'bg-gray-700 border-gray-600 text-gray-400'
                  }`}
                >
                  {formData.is_active ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      有効
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      無効
                    </>
                  )}
                </button>
              </div>

              {/* ボタン */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  {isEditing ? '更新' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
