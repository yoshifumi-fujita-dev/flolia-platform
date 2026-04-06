'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, MapPin, Gift, ChevronRight, Check } from 'lucide-react'
import { initLiff, isLoggedIn, login, getProfile } from '@/lib/liff'

const SLIDE_THRESHOLD = 95

export default function GymConnectPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState([])
  const [error, setError] = useState(null)
  const [lineUserId, setLineUserId] = useState(null)
  const [redeemingIds, setRedeemingIds] = useState({})
  const [sliderValues, setSliderValues] = useState({})
  const [message, setMessage] = useState(null)

  useEffect(() => {
    initializeLiff()
  }, [])

  async function initializeLiff() {
    try {
      setLoading(true)

      const liff = await initLiff(process.env.NEXT_PUBLIC_LIFF_MEMBER_MENU_ID)
      if (!liff) {
        throw new Error('LIFF の初期化に失敗しました')
      }

      if (!isLoggedIn()) {
        login()
        return
      }

      const profile = await getProfile()
      const userId = profile?.userId
      if (!userId) {
        throw new Error('LINEプロフィールの取得に失敗しました')
      }

      setLineUserId(userId)
      await fetchOffers(userId)
    } catch (err) {
      console.error('GymConnect error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchOffers(userId) {
    const res = await fetch(`/api/member/partner-offers?line_user_id=${userId}`)
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || '提携特典の取得に失敗しました')
    }
    setOffers(data.offers || [])
  }

  const handleSlide = async (offerId, value) => {
    setSliderValues((prev) => ({ ...prev, [offerId]: value }))

    if (value < SLIDE_THRESHOLD) return
    if (!lineUserId) return

    const target = offers.find((offer) => offer.id === offerId)
    if (!target || target.redeemed_today) return

    setRedeemingIds((prev) => ({ ...prev, [offerId]: true }))
    try {
      const res = await fetch(`/api/member/partner-offers/${offerId}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_user_id: lineUserId }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '利用記録に失敗しました')
      }

      setOffers((prev) =>
        prev.map((offer) =>
          offer.id === offerId
            ? { ...offer, redeemed_today: true }
            : offer
        )
      )
      setMessage('利用を記録しました')
    } catch (err) {
      console.error('Redeem error:', err)
      setMessage(err.message)
    } finally {
      setSliderValues((prev) => ({ ...prev, [offerId]: 0 }))
      setRedeemingIds((prev) => ({ ...prev, [offerId]: false }))
      setTimeout(() => setMessage(null), 2500)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">エラー</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/member')}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
            >
              メニューに戻る
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push('/member')}
            className="text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">ジムコネ</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-lg shadow-md p-4 text-sm text-gray-600">
          会員証QRの提示で特典を受けられます。利用時は下のスライドで記録してください。
        </div>

        {message && (
          <div className="bg-emerald-100 text-emerald-800 text-sm px-4 py-2 rounded-lg">
            {message}
          </div>
        )}

        {offers.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 text-gray-500">
            まだ提携特典が登録されていません。
          </div>
        )}

        {offers.map((offer) => {
          const sliderValue = sliderValues[offer.id] || 0
          const isRedeemed = offer.redeemed_today
          const isRedeeming = redeemingIds[offer.id]

          return (
            <div key={offer.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Gift className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">{offer.name}</h2>
                  {offer.address && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4" />
                      {offer.address}
                    </div>
                  )}
                  {offer.url && (
                    <a
                      href={offer.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-emerald-600 hover:underline mt-1 inline-block"
                    >
                      {offer.url}
                    </a>
                  )}
                </div>
                {isRedeemed && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                    利用済み（本日）
                  </span>
                )}
              </div>

              <p className="text-gray-700 mb-4 whitespace-pre-wrap">{offer.benefit}</p>
              <p className="text-xs text-gray-500 mb-4">
                利用頻度: {offer.usage_limit_type === 'none'
                  ? '制限なし'
                  : offer.usage_limit_type === 'weekly'
                    ? `週 ${offer.usage_limit_count || 1} 回まで`
                    : `月 ${offer.usage_limit_count || 1} 回まで`}
              </p>

              {/* スワイプスライダー */}
              <div className="relative">
                <div
                  className={`relative h-14 rounded-full overflow-hidden ${
                    isRedeemed
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                      : 'bg-gradient-to-r from-gray-100 to-gray-200'
                  }`}
                  style={{
                    boxShadow: isRedeemed
                      ? 'inset 0 2px 4px rgba(0,0,0,0.1)'
                      : 'inset 0 2px 4px rgba(0,0,0,0.06)',
                  }}
                >
                  {/* 進捗バー */}
                  {!isRedeemed && sliderValue > 0 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-75"
                      style={{ width: `${sliderValue}%` }}
                    />
                  )}

                  {/* テキスト */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {isRedeemed ? (
                      <span className="flex items-center gap-2 text-white font-medium">
                        <Check className="w-5 h-5" />
                        利用済み（本日）
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-1 text-sm font-medium transition-opacity"
                        style={{ opacity: sliderValue > 30 ? 0 : 1 }}
                      >
                        <span className="text-gray-500">スワイプして利用</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 animate-pulse" />
                        <ChevronRight className="w-4 h-4 text-gray-300 -ml-2 animate-pulse" />
                      </span>
                    )}
                  </div>

                  {/* スライダーつまみ */}
                  {!isRedeemed && (
                    <div
                      className="absolute top-1 bottom-1 left-1 w-12 rounded-full bg-white shadow-lg flex items-center justify-center transition-transform"
                      style={{
                        transform: `translateX(${(sliderValue / 100) * (100 - 14)}%)`,
                        left: `${sliderValue * 0.86}%`,
                      }}
                    >
                      <div className="flex items-center text-emerald-500">
                        <ChevronRight className="w-5 h-5 -mr-2" />
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  )}

                  {/* 透明なスライダー入力 */}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isRedeemed ? 100 : sliderValue}
                    disabled={isRedeemed || isRedeeming}
                    onChange={(e) => handleSlide(offer.id, Number(e.target.value))}
                    onMouseUp={() => setSliderValues((prev) => ({ ...prev, [offer.id]: 0 }))}
                    onTouchEnd={() => setSliderValues((prev) => ({ ...prev, [offer.id]: 0 }))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {/* ローディング表示 */}
                {isRedeeming && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-full">
                    <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
