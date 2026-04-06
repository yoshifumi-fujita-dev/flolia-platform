'use client'

import { useState, useEffect } from 'react'
import {
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  RefreshCw,
  Plus,
  X,
  Sparkles
} from 'lucide-react'

const statusConfig = {
  sending: { label: '送信中', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
  sent: { label: '送信済', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  failed: { label: '失敗', color: 'bg-red-100 text-red-800', icon: XCircle },
}

// 送信可能時間帯（9:00〜23:00）
const SEND_START_HOUR = 9
const SEND_END_HOUR = 23

// 現在が送信可能時間かチェック
const isSendableTime = () => {
  const now = new Date()
  const hour = now.getHours()
  return hour >= SEND_START_HOUR && hour < SEND_END_HOUR
}

// 次の送信可能時間を取得
const getNextSendableTime = () => {
  const now = new Date()
  const hour = now.getHours()

  if (hour < SEND_START_HOUR) {
    return `本日 ${SEND_START_HOUR}:00`
  } else {
    return `明日 ${SEND_START_HOUR}:00`
  }
}

export default function InstructorMessagesPage() {
  const [messages, setMessages] = useState([])
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [sending, setSending] = useState(false)

  // フォーム状態
  const [formData, setFormData] = useState({
    instructor_id: '',
    message: '',
  })

  // データ取得
  const fetchMessages = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/instructor-messages')
      if (!res.ok) throw new Error('メッセージの取得に失敗しました')
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchInstructors = async () => {
    try {
      const res = await fetch('/api/instructors')
      if (!res.ok) throw new Error('インストラクターの取得に失敗しました')
      const data = await res.json()
      setInstructors(data.instructors || [])
    } catch (err) {
      console.error('Instructors fetch error:', err)
    }
  }

  useEffect(() => {
    fetchMessages()
    fetchInstructors()
  }, [])

  // LINE連携済み会員数取得
  const [recipientCount, setRecipientCount] = useState(0)
  useEffect(() => {
    const fetchRecipientCount = async () => {
      try {
        const res = await fetch('/api/members?line_connected=true&status=active&limit=1')
        if (res.ok) {
          const data = await res.json()
          setRecipientCount(data.pagination?.total || 0)
        }
      } catch (err) {
        console.error('Recipient count fetch error:', err)
      }
    }
    fetchRecipientCount()
  }, [])

  // 送信可能かどうか
  const canSend = isSendableTime()

  // メッセージ送信
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.instructor_id || !formData.message) {
      alert('インストラクターとメッセージを入力してください')
      return
    }

    // 送信時間チェック
    if (!isSendableTime()) {
      alert(`送信可能時間外です。\n送信は ${SEND_START_HOUR}:00〜${SEND_END_HOUR}:00 の間のみ可能です。\n\n次に送信できる時間: ${getNextSendableTime()}`)
      return
    }

    if (!confirm(`${recipientCount}名の会員にメッセージを送信します。よろしいですか？`)) {
      return
    }

    try {
      setSending(true)
      const res = await fetch('/api/instructor-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, send_now: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '送信に失敗しました')
      }

      setShowModal(false)
      setFormData({ instructor_id: '', message: '' })
      fetchMessages()
      alert('メッセージを送信しました')
    } catch (err) {
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  // 日時フォーマット
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Send className="w-8 h-8 text-violet-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">インストラクターメッセージ</h1>
            <p className="text-sm text-gray-500">インストラクター名義でLINE会員にメッセージを送信</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新規メッセージ
        </button>
      </div>

      {/* 統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Users className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">LINE連携会員数</p>
              <p className="text-2xl font-bold text-gray-900">{recipientCount}名</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">送信済みメッセージ</p>
              <p className="text-2xl font-bold text-gray-900">
                {messages.filter(m => m.status === 'sent').length}件
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* メッセージ一覧 */}
      <div className="bg-white rounded-lg border">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">送信履歴</h2>
        </div>

        {messages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            まだメッセージがありません
          </div>
        ) : (
          <div className="divide-y">
            {messages.map((msg) => {
              const StatusIcon = statusConfig[msg.status]?.icon || AlertCircle
              return (
                <div key={msg.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {msg.instructor?.image_url ? (
                        <img
                          src={msg.instructor.image_url}
                          alt={msg.instructor.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-violet-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            {msg.instructor?.name || '不明'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusConfig[msg.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[msg.status]?.label || msg.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-2">
                          {msg.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {msg.sent_at && (
                            <span className="flex items-center gap-1">
                              <Send className="w-3 h-3" />
                              送信: {formatDateTime(msg.sent_at)}
                            </span>
                          )}
                          {msg.status === 'sent' && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {msg.sent_count}/{msg.total_recipients}名に送信
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 新規メッセージモーダル */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">新規メッセージ作成</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* インストラクター選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  インストラクター <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.instructor_id}
                  onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  required
                >
                  <option value="">選択してください</option>
                  {instructors.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* メッセージ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メッセージ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder="会員に送信するメッセージを入力してください"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  ※ メッセージは「【{formData.instructor_id ? instructors.find(i => i.id === formData.instructor_id)?.name : 'インストラクター名'}より】」という形式で送信されます
                </p>
              </div>

              {/* 送信対象 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  送信対象: <span className="font-medium text-gray-900">{recipientCount}名</span>
                  （LINE連携済みのアクティブ会員）
                </p>
              </div>

              {/* 送信時間制限の注意 */}
              {!canSend && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    現在は送信可能時間外です（{SEND_START_HOUR}:00〜{SEND_END_HOUR}:00）
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    次に送信できる時間: {getNextSendableTime()}
                  </p>
                </div>
              )}

              {/* ボタン */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={sending || !canSend}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {sending ? '送信中...' : canSend ? '送信する' : '時間外'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
