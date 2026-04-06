'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Clock,
  AlertCircle,
  Edit,
  PauseCircle,
  PlayCircle,
  UserX,
  FileText,
  X,
  Plus,
  Printer,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react'
import Image from 'next/image'

// ステータスラベル
const STATUS_LABELS = {
  active: { label: '在籍', color: 'bg-green-500/20 text-green-400', icon: PlayCircle },
  trial: { label: '体験', color: 'bg-blue-500/20 text-blue-400', icon: Users },
  visitor: { label: 'ビジター', color: 'bg-orange-500/20 text-orange-400', icon: Users },
  paused: { label: '休会', color: 'bg-yellow-500/20 text-yellow-400', icon: PauseCircle },
  canceled: { label: '退会', color: 'bg-red-500/20 text-red-400', icon: UserX },
  pending: { label: '手続中', color: 'bg-gray-500/20 text-gray-400', icon: Users },
}

// プラン契約ステータス
const PLAN_STATUS_LABELS = {
  active: { label: '有効', color: 'bg-green-500/20 text-green-400' },
  canceled: { label: 'キャンセル', color: 'bg-red-500/20 text-red-400' },
  pending: { label: '保留', color: 'bg-yellow-500/20 text-yellow-400' },
  paused: { label: '一時停止', color: 'bg-gray-500/20 text-gray-400' },
  expired: { label: '期限切れ', color: 'bg-gray-500/20 text-gray-400' },
}

export default function MemberDetailPage({ params }) {
  const { id } = params

  const [member, setMember] = useState(null)
  const [memberPlans, setMemberPlans] = useState([])
  const [plans, setPlans] = useState([]) // 利用可能なプラン一覧
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // モーダル状態
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  // ステータス変更用
  const [statusFormData, setStatusFormData] = useState({
    status: '',
    paused_from: '',
    paused_until: '',
    paused_reason: '',
  })

  // プラン追加用
  const [planFormData, setPlanFormData] = useState({
    membership_plan_id: '',
    started_at: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  })

  // 会員情報を取得
  const fetchMember = async () => {
    try {
      const res = await fetch(`/api/members/${id}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '会員情報の取得に失敗しました')
      }

      setMember(data.member)
    } catch (err) {
      setError(err.message)
    }
  }

  // プラン契約履歴を取得
  const fetchMemberPlans = async () => {
    try {
      const res = await fetch(`/api/members/${id}/plans`)
      const data = await res.json()

      if (res.ok) {
        setMemberPlans(data.plans || [])
      }
    } catch (err) {
      console.error('Failed to fetch member plans:', err)
    }
  }

  // 利用可能なプラン一覧を取得
  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/plans')
      const data = await res.json()

      if (res.ok) {
        setPlans(data.plans || [])
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchMember(), fetchMemberPlans(), fetchPlans()])
      setLoading(false)
    }
    loadData()
  }, [id])

  // ステータス変更モーダルを開く
  const openStatusModal = () => {
    if (!member) return
    setStatusFormData({
      status: member.status,
      paused_from: member.paused_from || '',
      paused_until: member.paused_until || '',
      paused_reason: member.paused_reason || '',
    })
    setIsStatusModalOpen(true)
  }

  // ステータス変更保存
  const handleStatusSubmit = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch(`/api/members/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusFormData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'ステータス変更に失敗しました')
      }

      setIsStatusModalOpen(false)
      fetchMember()
    } catch (err) {
      alert(err.message)
    }
  }

  // プラン追加モーダルを開く
  const openPlanModal = () => {
    setPlanFormData({
      membership_plan_id: plans[0]?.id || '',
      started_at: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    })
    setIsPlanModalOpen(true)
  }

  // プラン契約追加
  const handlePlanSubmit = async (e) => {
    e.preventDefault()

    try {
      const res = await fetch(`/api/members/${id}/plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planFormData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'プラン登録に失敗しました')
      }

      setIsPlanModalOpen(false)
      fetchMemberPlans()
    } catch (err) {
      alert(err.message)
    }
  }

  // プラン契約キャンセル
  const handleCancelPlan = async (planId) => {
    if (!confirm('このプラン契約をキャンセルしますか？')) return

    try {
      const res = await fetch(`/api/members/${id}/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'canceled' }),
      })

      if (!res.ok) {
        throw new Error('キャンセルに失敗しました')
      }

      fetchMemberPlans()
    } catch (err) {
      alert(err.message)
    }
  }

  // 会員名を取得
  const getMemberName = (m) => {
    if (m.last_name && m.first_name) {
      return `${m.last_name} ${m.first_name}`
    }
    return m.name || '未設定'
  }

  // 写真アップロード
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)

      const res = await fetch(`/api/members/${id}/photo`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '写真のアップロードに失敗しました')
      }

      fetchMember()
      setIsPhotoModalOpen(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  // 写真削除
  const handlePhotoDelete = async () => {
    if (!confirm('写真を削除しますか？')) return

    try {
      const res = await fetch(`/api/members/${id}/photo`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '写真の削除に失敗しました')
      }

      fetchMember()
      setIsPhotoModalOpen(false)
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg p-4">
          {error || '会員情報が見つかりません'}
        </div>
        <Link
          href="/backoffice/members"
          className="inline-flex items-center gap-2 mt-4 text-violet-400 hover:text-violet-300"
        >
          <ArrowLeft className="w-4 h-4" />
          会員一覧に戻る
        </Link>
      </div>
    )
  }

  const StatusIcon = STATUS_LABELS[member.status]?.icon || Users

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/backoffice/members"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          会員一覧に戻る
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* 会員写真 */}
            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="relative w-20 h-20 bg-violet-500/20 rounded-lg flex items-center justify-center overflow-hidden group hover:ring-2 hover:ring-violet-500 transition-all"
              title="写真を編集"
            >
              {member.photo_url ? (
                <Image
                  src={member.photo_url}
                  alt={getMemberName(member)}
                  fill
                  className="object-cover"
                />
              ) : (
                <Users className="w-10 h-10 text-violet-400" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">{getMemberName(member)}</h1>
              {member.member_number && (
                <p className="text-gray-400">会員番号: {member.member_number}</p>
              )}
            </div>
          </div>

          <button
            onClick={openStatusModal}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
              STATUS_LABELS[member.status]?.color || 'bg-gray-500/20 text-gray-400'
            }`}
          >
            <StatusIcon className="w-4 h-4" />
            {STATUS_LABELS[member.status]?.label || member.status}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 基本情報カード */}
        <div className="lg:col-span-2 space-y-6">
          {/* 連絡先情報 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              基本情報
            </h2>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-xs text-gray-500 mb-1">メールアドレス</dt>
                <dd className="flex items-center gap-2 text-gray-200">
                  <Mail className="w-4 h-4 text-gray-500" />
                  {member.email}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500 mb-1">電話番号</dt>
                <dd className="flex items-center gap-2 text-gray-200">
                  <Phone className="w-4 h-4 text-gray-500" />
                  {member.phone || '-'}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500 mb-1">住所</dt>
                <dd className="flex items-center gap-2 text-gray-200">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  {member.postal_code && `〒${member.postal_code} `}
                  {member.address || '-'}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500 mb-1">入会日</dt>
                <dd className="flex items-center gap-2 text-gray-200">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  {member.joined_at
                    ? format(new Date(member.joined_at), 'yyyy年M月d日', { locale: ja })
                    : '-'}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500 mb-1">生年月日</dt>
                <dd className="text-gray-200">
                  {member.birth_date
                    ? format(new Date(member.birth_date), 'yyyy年M月d日', { locale: ja })
                    : '-'}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500 mb-1">性別</dt>
                <dd className="text-gray-200">
                  {member.gender === 'female' ? '女性' : member.gender === 'male' ? '男性' : '-'}
                </dd>
              </div>
            </dl>

            {/* 休会情報 */}
            {member.status === 'paused' && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-2">
                  <PauseCircle className="w-4 h-4" />
                  休会中
                </h3>
                <p className="text-sm text-gray-300">
                  期間: {member.paused_from || '未設定'} 〜 {member.paused_until || '未設定'}
                </p>
                {member.paused_reason && (
                  <p className="text-sm text-gray-400 mt-1">理由: {member.paused_reason}</p>
                )}
              </div>
            )}

            {/* 緊急連絡先 */}
            {(member.emergency_name || member.emergency_phone) && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-2">緊急連絡先</h3>
                <p className="text-gray-200">
                  {member.emergency_name}
                  {member.emergency_relationship && ` (${member.emergency_relationship})`}
                </p>
                {member.emergency_phone && (
                  <p className="text-gray-400 text-sm">{member.emergency_phone}</p>
                )}
              </div>
            )}

            {/* 備考 */}
            {member.notes && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h3 className="text-sm font-medium text-gray-400 mb-2">スタッフメモ</h3>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">{member.notes}</p>
              </div>
            )}
          </div>

          {/* プラン契約履歴 */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-violet-400" />
                プラン契約履歴
              </h2>
              <button
                onClick={openPlanModal}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                プラン追加
              </button>
            </div>

            {memberPlans.length === 0 ? (
              <p className="text-gray-500 text-sm">プラン契約履歴がありません</p>
            ) : (
              <div className="space-y-3">
                {memberPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {plan.membership_plan?.name || 'プラン名なし'}
                      </p>
                      <p className="text-sm text-gray-400">
                        {plan.started_at
                          ? format(new Date(plan.started_at), 'yyyy/M/d', { locale: ja })
                          : '-'}{' '}
                        〜
                        {plan.ended_at
                          ? format(new Date(plan.ended_at), 'yyyy/M/d', { locale: ja })
                          : '継続中'}
                      </p>
                      {plan.ticket_remaining !== null && (
                        <p className="text-sm text-gray-400">
                          残り回数: {plan.ticket_remaining} / {plan.ticket_total}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          PLAN_STATUS_LABELS[plan.status]?.color || 'bg-gray-500/20 text-gray-400'
                        }`}
                      >
                        {PLAN_STATUS_LABELS[plan.status]?.label || plan.status}
                      </span>
                      {plan.status === 'active' && (
                        <button
                          onClick={() => handleCancelPlan(plan.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          キャンセル
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* クイックアクション */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-medium text-white mb-4">クイックアクション</h2>
            <div className="space-y-2">
              <button
                onClick={openStatusModal}
                className="w-full flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                <Edit className="w-4 h-4" />
                ステータス変更
              </button>
              <button
                onClick={openPlanModal}
                className="w-full flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                <CreditCard className="w-4 h-4" />
                プラン契約追加
              </button>
              <Link
                href={`/admin/bookings?member_id=${member.id}`}
                className="w-full flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors text-sm"
              >
                <Calendar className="w-4 h-4" />
                代理予約
              </Link>
              <a
                href={`/api/member/card-pdf?member_id=${member.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm"
              >
                <Printer className="w-4 h-4" />
                会員証を発行（PDF）
              </a>
            </div>
          </div>

          {/* Stripe情報 */}
          {(member.stripe_customer_id || member.stripe_subscription_id) && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-violet-400" />
                Stripe連携
              </h2>
              <dl className="space-y-3 text-sm">
                {member.stripe_customer_id && (
                  <div>
                    <dt className="text-xs text-gray-500">Customer ID</dt>
                    <dd className="text-gray-300 font-mono text-xs break-all">
                      {member.stripe_customer_id}
                    </dd>
                  </div>
                )}
                {member.stripe_subscription_id && (
                  <div>
                    <dt className="text-xs text-gray-500">Subscription ID</dt>
                    <dd className="text-gray-300 font-mono text-xs break-all">
                      {member.stripe_subscription_id}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* マーケティング情報 */}
          {(member.referral_source || member.goals || member.exercise_experience) && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-400" />
                その他の情報
              </h2>
              <dl className="space-y-3 text-sm">
                {member.referral_source && (
                  <div>
                    <dt className="text-xs text-gray-500">来店きっかけ</dt>
                    <dd className="text-gray-300">{member.referral_source}</dd>
                  </div>
                )}
                {member.goals && (
                  <div>
                    <dt className="text-xs text-gray-500">目的・目標</dt>
                    <dd className="text-gray-300">{member.goals}</dd>
                  </div>
                )}
                {member.exercise_experience && (
                  <div>
                    <dt className="text-xs text-gray-500">運動経験</dt>
                    <dd className="text-gray-300">{member.exercise_experience}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsStatusModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => setIsStatusModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">ステータス変更</h2>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ステータス</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_LABELS).map(([value, { label, icon: Icon }]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStatusFormData({ ...statusFormData, status: value })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                        statusFormData.status === value
                          ? 'border-violet-500 bg-violet-500/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-200">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {statusFormData.status === 'paused' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        休会開始日
                      </label>
                      <input
                        type="date"
                        value={statusFormData.paused_from}
                        onChange={(e) =>
                          setStatusFormData({ ...statusFormData, paused_from: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        休会終了予定日
                      </label>
                      <input
                        type="date"
                        value={statusFormData.paused_until}
                        onChange={(e) =>
                          setStatusFormData({ ...statusFormData, paused_until: e.target.value })
                        }
                        className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">休会理由</label>
                    <textarea
                      value={statusFormData.paused_reason}
                      onChange={(e) =>
                        setStatusFormData({ ...statusFormData, paused_reason: e.target.value })
                      }
                      rows={2}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  変更を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Plan Add Modal */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsPlanModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => setIsPlanModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6">プラン契約追加</h2>

            <form onSubmit={handlePlanSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">プラン</label>
                <select
                  value={planFormData.membership_plan_id}
                  onChange={(e) =>
                    setPlanFormData({ ...planFormData, membership_plan_id: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - ¥{plan.price?.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">開始日</label>
                <input
                  type="date"
                  value={planFormData.started_at}
                  onChange={(e) => setPlanFormData({ ...planFormData, started_at: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">備考</label>
                <textarea
                  value={planFormData.notes}
                  onChange={(e) => setPlanFormData({ ...planFormData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 py-2 px-4 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Edit Modal */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setIsPhotoModalOpen(false)} />
          <div className="relative bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <button
              onClick={() => setIsPhotoModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-700 rounded-full text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-2">
              <Camera className="w-5 h-5 text-violet-400" />
              会員写真
            </h2>

            {/* 現在の写真プレビュー */}
            <div className="mb-6">
              <div className="relative w-40 h-40 mx-auto bg-gray-700 rounded-lg overflow-hidden">
                {member.photo_url ? (
                  <Image
                    src={member.photo_url}
                    alt={getMemberName(member)}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Users className="w-16 h-16 text-gray-500" />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {/* アップロードボタン */}
              <label className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors cursor-pointer">
                <Upload className="w-5 h-5" />
                {isUploadingPhoto ? 'アップロード中...' : '写真をアップロード'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>

              {/* 削除ボタン（写真がある場合のみ） */}
              {member.photo_url && (
                <button
                  onClick={handlePhotoDelete}
                  className="w-full py-3 px-4 border border-red-500 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  写真を削除
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              JPEG、PNG、WebP形式（5MB以下）
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
