'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  ArrowLeft,
  Send,
  RefreshCw,
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
  Loader2,
  ExternalLink,
  Store,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const STATUS_LABELS = {
  open: { label: '未対応', color: 'bg-red-500/20 text-red-400 border-red-500/50' },
  in_progress: { label: '対応中', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
  resolved: { label: '解決済み', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
  closed: { label: 'クローズ', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' },
}

export default function AdminInquiryChatPage() {
  const params = useParams()
  const router = useRouter()
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const [inquiry, setInquiry] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const fetchInquiry = useCallback(async () => {
    try {
      const res = await fetch(`/api/inquiries/${params.id}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'お問い合わせの取得に失敗しました')
      }

      setInquiry(data.inquiry)
      setMessages(data.messages || [])
    } catch (err) {
      console.error('Error fetching inquiry:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchInquiry()
  }, [fetchInquiry])

  // 5秒ごとに自動更新
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInquiry()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchInquiry])

  // メッセージ追加時に下にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!replyText.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(`/api/inquiries/${params.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '送信に失敗しました')
      }

      setReplyText('')
      // メッセージを即座に追加
      setMessages(prev => [...prev, data.message])
      // ステータスを対応中に自動更新
      if (inquiry.status === 'open') {
        setInquiry(prev => ({ ...prev, status: 'in_progress' }))
      }
      inputRef.current?.focus()
    } catch (err) {
      console.error('Error sending reply:', err)
      alert(err.message)
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/inquiries/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'ステータスの更新に失敗しました')
      }

      setInquiry(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      console.error('Error updating status:', err)
      alert(err.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    )
  }

  if (error || !inquiry) {
    return (
      <div className="p-6">
        <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg">
          {error || 'お問い合わせが見つかりません'}
        </div>
        <button
          onClick={() => router.push('/admin/inquiries')}
          className="mt-4 flex items-center gap-2 text-gray-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          一覧に戻る
        </button>
      </div>
    )
  }

  const statusConfig = STATUS_LABELS[inquiry.status] || STATUS_LABELS.open

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ヘッダー */}
      <div className="bg-gray-800/80 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/inquiries')}
              className="text-gray-400 hover:text-white transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* プロフィール */}
            <div className="flex items-center gap-3">
              {inquiry.profile_image_url ? (
                <Image
                  src={inquiry.profile_image_url}
                  alt={inquiry.display_name || 'ユーザー'}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">
                    {inquiry.display_name || '名前未設定'}
                  </span>
                  {inquiry.member && (
                    <Link
                      href={`/admin/members/${inquiry.member.id}`}
                      className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded hover:bg-violet-500/30 transition flex items-center gap-1"
                    >
                      会員詳細
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  {inquiry.store ? (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1">
                      <Store className="w-3 h-3" />
                      {inquiry.store.name}
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-0.5 rounded">
                      店舗未選択
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  開始: {format(new Date(inquiry.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                </p>
              </div>
            </div>
          </div>

          {/* ステータス変更 */}
          <div className="flex items-center gap-2">
            <select
              value={inquiry.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={updatingStatus}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${statusConfig.color} bg-transparent focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50`}
            >
              <option value="open" className="bg-gray-800 text-white">未対応</option>
              <option value="in_progress" className="bg-gray-800 text-white">対応中</option>
              <option value="resolved" className="bg-gray-800 text-white">解決済み</option>
              <option value="closed" className="bg-gray-800 text-white">クローズ</option>
            </select>
          </div>
        </div>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            メッセージはありません
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                  message.direction === 'outgoing'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-gray-700 text-white rounded-bl-sm'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
                <div className={`text-xs mt-1 ${
                  message.direction === 'outgoing' ? 'text-violet-200' : 'text-gray-400'
                }`}>
                  {format(new Date(message.created_at), 'HH:mm', { locale: ja })}
                  {message.direction === 'outgoing' && message.sent_by_staff && (
                    <span className="ml-2">
                      by {message.sent_by_staff.name || 'スタッフ'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="bg-gray-800/80 border-t border-gray-700 p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-violet-500 focus:outline-none resize-none max-h-32"
            style={{ minHeight: '48px' }}
          />
          <button
            onClick={handleSend}
            disabled={!replyText.trim() || sending}
            className="bg-violet-600 text-white p-3 rounded-lg hover:bg-violet-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Enter で送信 / Shift + Enter で改行
        </p>
      </div>
    </div>
  )
}
