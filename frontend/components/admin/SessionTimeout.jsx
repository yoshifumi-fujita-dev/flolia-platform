'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const DEFAULT_TIMEOUT_MINUTES = 30
const WARNING_MINUTES = 5 // 残り5分で警告

export default function SessionTimeout() {
  const [showWarning, setShowWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES)
  const timeoutRef = useRef(null)
  const warningRef = useRef(null)
  const countdownRef = useRef(null)
  const lastActivityRef = useRef(Date.now())
  const showWarningRef = useRef(false)

  // showWarning の ref を同期
  useEffect(() => {
    showWarningRef.current = showWarning
  }, [showWarning])

  // データベースから設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/system-settings?key=session_timeout_minutes')
        const data = await res.json()
        if (data.setting?.value) {
          const parsed = parseInt(data.setting.value, 10)
          if (!isNaN(parsed) && parsed > 0) {
            setTimeoutMinutes(parsed)
          }
        }
      } catch (error) {
        console.error('Failed to load session timeout setting:', error)
      }
    }

    loadSettings()

    // 定期的に設定を再読み込み（5分ごと）
    const interval = setInterval(loadSettings, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/backoffice/login?reason=timeout'
  }, [])

  const resetTimer = useCallback(() => {
    // 既存のタイマーをクリア
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    setShowWarning(false)
    lastActivityRef.current = Date.now()

    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningMs = WARNING_MINUTES * 60 * 1000

    // 警告タイマー
    warningRef.current = setTimeout(() => {
      setShowWarning(true)
      setRemainingTime(warningMs / 1000)

      // カウントダウン開始
      countdownRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, timeoutMs - warningMs)

    // ログアウトタイマー
    timeoutRef.current = setTimeout(() => {
      handleLogout()
    }, timeoutMs)
  }, [timeoutMinutes, handleLogout])

  const extendSession = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  useEffect(() => {
    // タイマー設定
    resetTimer()

    // ユーザーアクティビティを監視
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart']

    const handleActivity = () => {
      // 警告表示中はアクティビティでリセットしない
      if (!showWarningRef.current) {
        // 頻繁なリセットを避けるため、1秒以上経過している場合のみリセット
        const now = Date.now()
        if (now - lastActivityRef.current > 1000) {
          resetTimer()
        }
      }
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      // クリーンアップ
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)

      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [resetTimer])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-2">
          セッションタイムアウト
        </h3>
        <p className="text-gray-300 mb-4">
          セキュリティのため、{formatTime(remainingTime)} 後に自動的にログアウトされます。
        </p>
        <p className="text-gray-400 text-sm mb-6">
          操作を続ける場合は「延長する」をクリックしてください。
        </p>
        <div className="flex gap-3">
          <button
            onClick={extendSession}
            className="flex-1 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-medium rounded-lg transition-colors"
          >
            延長する
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  )
}
