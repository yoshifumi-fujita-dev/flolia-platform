'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  LogIn,
  CheckCircle,
  XCircle,
  User,
  Clock,
  RefreshCw,
  Loader2,
  Store,
  ArrowLeft,
  Briefcase,
} from 'lucide-react'

// スキャン状態
const SCAN_STATE = {
  WAITING: 'waiting',
  SCANNING: 'scanning',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  ERROR: 'error',
}

// セッションキー（入退館専用）
const SESSION_KEY = 'tablet_attendance_session'

export default function TabletAttendanceCheckinPage() {
  const router = useRouter()
  const scannerRef = useRef(null)

  const [scanState, setScanState] = useState(SCAN_STATE.WAITING)
  const [member, setMember] = useState(null)
  const [staff, setStaff] = useState(null)
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState('')
  const [stores, setStores] = useState([])
  const [selectedStore, setSelectedStore] = useState(null)
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  // 認証チェック
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    setIsAuthChecking(true)
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        router.replace('/tablet/attendance/login')
        return
      }

      const session = JSON.parse(sessionData)

      if (new Date(session.expires_at) < new Date()) {
        localStorage.removeItem(SESSION_KEY)
        router.replace('/tablet/attendance/login')
        return
      }

      const res = await fetch(`/api/tablet/auth?token=${session.token}`)
      if (res.ok) {
        const data = await res.json()
        if (data.valid) {
          setIsAuthenticated(true)
        } else {
          localStorage.removeItem(SESSION_KEY)
          router.replace('/tablet/attendance/login')
          return
        }
      } else {
        localStorage.removeItem(SESSION_KEY)
        router.replace('/tablet/attendance/login')
        return
      }
    } catch (error) {
      console.error('Auth check error:', error)
      localStorage.removeItem(SESSION_KEY)
      router.replace('/tablet/attendance/login')
    } finally {
      setIsAuthChecking(false)
    }
  }

  // 時計を更新
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 店舗一覧を取得
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchStores = async () => {
      try {
        const res = await fetch('/api/public/stores')
        if (res.ok) {
          const data = await res.json()
          setStores(data.stores || [])
          const savedStoreId = localStorage.getItem('tablet_attendance_store_id')
          if (savedStoreId && data.stores?.find(s => s.id === savedStoreId)) {
            setSelectedStore(savedStoreId)
          } else if (data.stores?.length > 0) {
            setSelectedStore(data.stores[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch stores:', err)
      } finally {
        setIsLoadingStores(false)
      }
    }
    fetchStores()
  }, [isAuthenticated])

  // 店舗選択時に保存
  useEffect(() => {
    if (selectedStore) {
      localStorage.setItem('tablet_attendance_store_id', selectedStore)
    }
  }, [selectedStore])

  // QRコードスキャナー初期化
  useEffect(() => {
    if (!isAuthenticated || isAuthChecking) return

    let html5QrCode = null

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode')

        html5QrCode = new Html5Qrcode('qr-reader-attendance-checkin')
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          onScanSuccess,
          () => {}
        )

        setScanState(SCAN_STATE.SCANNING)
      } catch (err) {
        console.error('Scanner init error:', err)
        setError('カメラを起動できませんでした。カメラへのアクセスを許可してください。')
        setScanState(SCAN_STATE.ERROR)
      }
    }

    if (scanState === SCAN_STATE.WAITING || scanState === SCAN_STATE.SCANNING) {
      initScanner()
    }

    return () => {
      if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(console.error)
      }
    }
  }, [isAuthenticated, isAuthChecking])

  const onScanSuccess = useCallback(async (decodedText) => {
    const memberMatch = decodedText.match(/^flolia:\/\/member\/([a-f0-9-]+)$/i)
    const staffMatch = decodedText.match(/^flolia:\/\/staff\/([a-f0-9-]+)$/i)
    const bookingMatch = decodedText.match(/^flolia:\/\/booking\/([a-f0-9-]+)$/i)

    if (!memberMatch && !staffMatch && !bookingMatch) return

    if (scannerRef.current?.isScanning) {
      await scannerRef.current.pause()
    }

    setScanState(SCAN_STATE.PROCESSING)

    try {
      const storeId = localStorage.getItem('tablet_attendance_store_id')

      if (memberMatch) {
        const qrToken = memberMatch[1]
        await handleMemberCheckin(qrToken, storeId)
      } else if (staffMatch) {
        const qrToken = staffMatch[1]
        await handleStaffCheckin(qrToken, storeId)
      } else if (bookingMatch) {
        const qrToken = bookingMatch[1]
        await handleBookingCheckin(qrToken, storeId)
      }

      setTimeout(() => {
        resetScanner()
      }, 4000)

    } catch (err) {
      setError(err.message)
      setScanState(SCAN_STATE.ERROR)

      setTimeout(() => {
        resetScanner()
      }, 5000)
    }
  }, [])

  const handleMemberCheckin = async (qrToken, storeId) => {
    const scanRes = await fetch('/api/tablet/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_token: qrToken }),
    })

    const scanData = await scanRes.json()

    if (!scanRes.ok) {
      throw new Error(scanData.error || '会員情報の取得に失敗しました')
    }

    const memberData = scanData.member

    if (scanData.current_visit) {
      throw new Error('既に入館中です。退館画面から退館してください。')
    }

    if (memberData.status !== 'active' && memberData.status !== 'trial') {
      throw new Error('会員ステータスが有効ではないため入館できません')
    }

    const checkinRes = await fetch('/api/tablet/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_id: memberData.id,
        store_id: storeId,
      }),
    })

    const checkinData = await checkinRes.json()

    if (!checkinRes.ok) {
      throw new Error(checkinData.error || '入館処理に失敗しました')
    }

    setMember(memberData)
    setStaff(null)
    setBooking(null)
    setScanState(SCAN_STATE.SUCCESS)
  }

  const handleStaffCheckin = async (qrToken, storeId) => {
    const scanRes = await fetch('/api/tablet/scan-staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_token: qrToken }),
    })

    const scanData = await scanRes.json()

    if (!scanRes.ok) {
      throw new Error(scanData.error || 'スタッフ情報の取得に失敗しました')
    }

    const staffData = scanData.staff

    if (staffData.status !== 'active') {
      throw new Error('スタッフステータスが有効ではないため出勤できません')
    }

    // 既に出勤中かチェック
    if (scanData.today_attendance?.clock_in_at && !scanData.today_attendance?.clock_out_at) {
      throw new Error('既に出勤中です。退勤画面から退勤してください。')
    }

    if (scanData.today_attendance?.clock_out_at) {
      throw new Error('本日の勤務は既に完了しています。')
    }

    const checkinRes = await fetch('/api/tablet/staff-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: staffData.id,
        store_id: storeId,
      }),
    })

    const checkinData = await checkinRes.json()

    if (!checkinRes.ok) {
      throw new Error(checkinData.error || '出勤処理に失敗しました')
    }

    setMember(null)
    setStaff(staffData)
    setBooking(null)
    setScanState(SCAN_STATE.SUCCESS)
  }

  const handleBookingCheckin = async (qrToken, storeId) => {
    const scanRes = await fetch('/api/tablet/scan-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_token: qrToken, store_id: storeId }),
    })

    const scanData = await scanRes.json()

    if (!scanRes.ok) {
      throw new Error(scanData.error || '予約情報の取得に失敗しました')
    }

    const bookingData = scanData.booking

    const checkinRes = await fetch('/api/tablet/checkin-booking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingData.id,
        store_id: storeId,
      }),
    })

    const checkinData = await checkinRes.json()

    if (!checkinRes.ok) {
      throw new Error(checkinData.error || '入館処理に失敗しました')
    }

    setMember(null)
    setStaff(null)
    setBooking(bookingData)
    setScanState(SCAN_STATE.SUCCESS)
  }

  const resetScanner = () => {
    window.location.reload()
  }

  const handleBack = () => {
    router.push('/tablet/attendance')
  }

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-emerald-900 text-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-emerald-900 text-white">
      {/* ヘッダー */}
      <header className="bg-black/20 backdrop-blur-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <Image src="/logo.png" alt="FLOLIA" width={120} height={40} className="h-10 w-auto brightness-0 invert" />
            <div className="flex items-center gap-2">
              <LogIn className="w-6 h-6 text-green-400" />
              <span className="text-xl font-bold">入館</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-green-300" />
              <select
                value={selectedStore || ''}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              >
                {stores.map((store) => (
                  <option key={store.id} value={store.id} className="text-gray-900">
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-green-200">
              <Clock className="w-5 h-5" />
              <span className="text-lg font-mono">
                {currentTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-4xl mx-auto p-6">
        {(scanState === SCAN_STATE.WAITING || scanState === SCAN_STATE.SCANNING) && (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">入館</h1>
            <p className="text-green-200 text-xl mb-8">QRコードをかざしてください</p>

            <div className="relative inline-block">
              <div
                id="qr-reader-attendance-checkin"
                className="w-80 h-80 mx-auto rounded-2xl overflow-hidden bg-black"
              />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-white/50 rounded-xl" />
                <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
              </div>
            </div>

            {scanState === SCAN_STATE.WAITING && (
              <div className="mt-6 flex items-center justify-center gap-2 text-green-300">
                <Loader2 className="w-5 h-5 animate-spin" />
                カメラを起動中...
              </div>
            )}

            <div className="mt-6 text-sm text-green-300/70">
              会員証・スタッフ証のQRコードに対応しています
            </div>
          </div>
        )}

        {scanState === SCAN_STATE.PROCESSING && (
          <div className="text-center">
            <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
              <Loader2 className="w-16 h-16 text-green-400 animate-spin" />
            </div>
            <h1 className="text-3xl font-bold">処理中...</h1>
          </div>
        )}

        {/* 会員入館成功 */}
        {scanState === SCAN_STATE.SUCCESS && member && (
          <div className="text-center">
            <div className="w-40 h-40 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <CheckCircle className="w-24 h-24 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4">ようこそ！</h1>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3 mb-2">
                <User className="w-8 h-8 text-green-300" />
                <span className="text-3xl font-bold">{member.name}</span>
                <span className="text-green-300">さん</span>
              </div>
              <p className="text-green-200">会員番号: {member.member_number}</p>
            </div>
          </div>
        )}

        {/* スタッフ出勤成功 */}
        {scanState === SCAN_STATE.SUCCESS && staff && (
          <div className="text-center">
            <div className="w-40 h-40 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <Briefcase className="w-24 h-24 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4">出勤しました</h1>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3 mb-2">
                <User className="w-8 h-8 text-blue-300" />
                <span className="text-3xl font-bold">{staff.name}</span>
                <span className="text-blue-300">さん</span>
              </div>
              <p className="text-blue-200">社員番号: {staff.employee_number}</p>
              <p className="text-blue-300 mt-2">
                {currentTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 出勤
              </p>
            </div>
          </div>
        )}

        {/* 予約入館成功 */}
        {scanState === SCAN_STATE.SUCCESS && booking && (
          <div className="text-center">
            <div className="w-40 h-40 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
              <CheckCircle className="w-24 h-24 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4">ようこそ！</h1>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-3 mb-2">
                <User className="w-8 h-8 text-green-300" />
                <span className="text-3xl font-bold">{booking.name}</span>
                <span className="text-green-300">さん</span>
              </div>
              <p className="text-green-200">
                {booking.booking_type === 'trial' ? '体験' : '見学'}予約
                {booking.time && ` ・ ${booking.time}`}
              </p>
            </div>
          </div>
        )}

        {scanState === SCAN_STATE.ERROR && (
          <div className="text-center">
            <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-8">
              <XCircle className="w-20 h-20 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4">エラー</h1>
            <p className="text-red-300 text-lg mb-8">{error}</p>
            <button
              onClick={resetScanner}
              className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-lg transition-all mx-auto"
            >
              <RefreshCw className="w-6 h-6" />
              やり直す
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
