'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import Image from 'next/image'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  Target,
  Users,
  CreditCard,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  FileText,
  Shield,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Download,
  Store,
  MessageCircle,
  Camera,
} from 'lucide-react'
import Link from 'next/link'
import { initLiff, getProfile, isLoggedIn, isInLineApp, login } from '@/lib/liff'
import PhotoCapture from '@/components/register/PhotoCapture'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

const REFERRAL_SOURCES = [
  'Instagram',
  'Google検索',
  '友人・知人の紹介',
  'チラシ・ポスター',
  '通りがかり',
  'その他',
]

const EXERCISE_EXPERIENCES = [
  '運動経験なし',
  '1年未満',
  '1〜3年',
  '3年以上',
]

const EMERGENCY_RELATIONSHIPS = [
  '配偶者',
  '父',
  '母',
  '兄',
  '姉',
  '弟',
  '妹',
  '子',
  '祖父',
  '祖母',
  '友人',
  'その他',
]

const GENDERS = [
  { value: 'female', label: '女性' },
  { value: 'male', label: '男性' },
  { value: 'other', label: 'その他' },
]

// 年齢計算ヘルパー関数
const calculateAge = (birthDate) => {
  if (!birthDate) return null
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// ステップインジケーター
const StepIndicator = ({ currentStep, totalSteps }) => (
  <div className="flex items-center justify-center gap-2 mb-8">
    {[...Array(totalSteps)].map((_, index) => (
      <div key={index} className="flex items-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
            index < currentStep
              ? 'bg-violet-600 text-white'
              : index === currentStep
              ? 'bg-violet-600 text-white ring-4 ring-violet-200'
              : 'bg-gray-200 text-gray-500'
          }`}
        >
          {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
        </div>
        {index < totalSteps - 1 && (
          <div
            className={`w-12 h-1 mx-1 ${
              index < currentStep ? 'bg-violet-600' : 'bg-gray-200'
            }`}
          />
        )}
      </div>
    ))}
  </div>
)

// ステップ1: 基本情報
const Step1BasicInfo = ({ formData, setFormData, errors }) => {
  const age = calculateAge(formData.birth_date)
  const isMinor = age !== null && age < 18

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">基本情報</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            姓 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                errors.last_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="山田"
            />
          </div>
          {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.first_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="花子"
          />
          {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            セイ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.last_name_kana}
            onChange={(e) => setFormData({ ...formData, last_name_kana: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.last_name_kana ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="ヤマダ"
          />
          {errors.last_name_kana && <p className="text-red-500 text-sm mt-1">{errors.last_name_kana}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            メイ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.first_name_kana}
            onChange={(e) => setFormData({ ...formData, first_name_kana: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.first_name_kana ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="ハナコ"
          />
          {errors.first_name_kana && <p className="text-red-500 text-sm mt-1">{errors.first_name_kana}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            生年月日 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.birth_date}
            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value, parental_consent_agreed: false })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.birth_date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.birth_date && <p className="text-red-500 text-sm mt-1">{errors.birth_date}</p>}
          {age !== null && (
            <p className="text-sm text-gray-500 mt-1">{age}歳</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            性別 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.gender ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">選択してください</option>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
          {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
        </div>
      </div>

      {/* 未成年者向け保護者同意書セクション */}
      {isMinor && (
        <div className="border-2 border-amber-300 bg-amber-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-amber-800 mb-2">18歳未満の方へ</h3>
              <p className="text-sm text-amber-700 mb-4">
                18歳未満の方がご入会いただくには、保護者の方の同意が必要です。
                下記より保護者同意書をダウンロードし、保護者の方に署名をいただいた上で、
                ご来店時にスタジオへご提出ください。
              </p>

              <a
                href="/parental-consent"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition mb-4"
              >
                <Download className="w-4 h-4" />
                保護者同意書を開く（印刷/PDF保存）
              </a>

              <div className="mt-4 border-t border-amber-200 pt-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.parental_consent_agreed || false}
                    onChange={(e) => setFormData({ ...formData, parental_consent_agreed: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm text-amber-800">
                    <span className="font-medium">保護者同意書をダウンロードしました。</span>
                    <br />
                    署名済みの同意書を来店時に持参することを理解しました。
                  </span>
                </label>
                {errors.parental_consent && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.parental_consent}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          電話番号 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="090-1234-5678"
          />
        </div>
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="example@email.com"
          />
        </div>
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
      </div>
    </div>
  )
}

// ステップ2: メール認証
const Step2Verification = ({ formData, setFormData, errors }) => {
  const [emailCode, setEmailCode] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailVerifying, setEmailVerifying] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailCountdown, setEmailCountdown] = useState(0)

  // カウントダウンタイマー
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [emailCountdown])

  // メール認証コード送信
  const sendEmailCode = async () => {
    setEmailError('')
    setEmailSending(true)
    try {
      const res = await fetch('/api/verification/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', email: formData.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setEmailSent(true)
      setEmailCountdown(60)
    } catch (err) {
      setEmailError(err.message || 'メール送信に失敗しました')
    } finally {
      setEmailSending(false)
    }
  }

  // メール認証コード検証
  const verifyEmailCode = async () => {
    setEmailError('')
    setEmailVerifying(true)
    try {
      const res = await fetch('/api/verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'email', email: formData.email, code: emailCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFormData({ ...formData, email_verified: true, email_verified_at: data.verifiedAt })
    } catch (err) {
      setEmailError(err.message || '認証に失敗しました')
    } finally {
      setEmailVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">メールアドレス認証</h2>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          ご登録いただいたメールアドレスが正しいことを確認するため、
          認証コードによる確認を行います。
        </p>
      </div>

      {/* メール認証 */}
      <div className={`border rounded-lg p-6 ${formData.email_verified ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${formData.email_verified ? 'bg-green-500' : 'bg-gray-200'}`}>
            {formData.email_verified ? (
              <Check className="w-5 h-5 text-white" />
            ) : (
              <Mail className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">メールアドレス認証</h3>
            <p className="text-sm text-gray-500">{formData.email}</p>
          </div>
          {formData.email_verified && (
            <span className="ml-auto text-sm text-green-600 font-medium">認証済み</span>
          )}
        </div>

        {!formData.email_verified && (
          <>
            {!emailSent ? (
              <button
                type="button"
                onClick={sendEmailCode}
                disabled={emailSending}
                className="w-full py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {emailSending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    送信中...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    認証コードを送信
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6桁のコードを入力"
                    maxLength={6}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="button"
                    onClick={verifyEmailCode}
                    disabled={emailCode.length !== 6 || emailVerifying}
                    className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    {emailVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : '確認'}
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">コードが届かない場合</span>
                  <button
                    type="button"
                    onClick={sendEmailCode}
                    disabled={emailCountdown > 0 || emailSending}
                    className="text-violet-600 hover:text-violet-700 disabled:text-gray-400 flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {emailCountdown > 0 ? `${emailCountdown}秒後に再送信可能` : '再送信'}
                  </button>
                </div>
              </div>
            )}
            {emailError && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {emailError}
              </p>
            )}
          </>
        )}
      </div>

      {/* 認証状況サマリー - 未認証の場合のみ表示 */}
      {!formData.email_verified && errors.verification && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {errors.verification}
          </p>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-xs text-gray-500">
          認証コードは10分間有効です。コードが届かない場合は、迷惑メールフォルダをご確認いただくか、
          メールアドレスに間違いがないかご確認ください。
        </p>
      </div>
    </div>
  )
}

// ステップ3: 住所・緊急連絡先・その他
const Step3Additional = ({ formData, setFormData, errors }) => {
  const [isSearching, setIsSearching] = useState(false)

  // 郵便番号から住所を検索
  const searchAddress = async (postalCode) => {
    const cleanCode = postalCode.replace(/[^0-9]/g, '')
    if (cleanCode.length !== 7) return

    setIsSearching(true)
    try {
      const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleanCode}`)
      const data = await res.json()

      if (data.results && data.results.length > 0) {
        const result = data.results[0]
        const address = `${result.address1}${result.address2}${result.address3}`
        setFormData((prev) => ({ ...prev, address }))
      }
    } catch (error) {
      console.error('住所検索エラー:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handlePostalCodeChange = (e) => {
    let value = e.target.value
    value = value.replace(/[^0-9-]/g, '')

    if (value.length === 3 && !value.includes('-')) {
      value = value + '-'
    } else if (value.length > 3 && !value.includes('-')) {
      value = value.slice(0, 3) + '-' + value.slice(3)
    }

    value = value.slice(0, 8)
    setFormData({ ...formData, postal_code: value })

    const cleanCode = value.replace(/-/g, '')
    if (cleanCode.length === 7) {
      searchAddress(value)
    }
  }

  return (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-gray-900 mb-6">住所・緊急連絡先</h2>

    <div className="grid grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          郵便番号 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={formData.postal_code}
            onChange={handlePostalCodeChange}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.postal_code ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="123-4567"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-500 animate-spin" />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">入力すると住所を自動検索</p>
        {errors.postal_code && <p className="text-red-500 text-sm mt-1">{errors.postal_code}</p>}
      </div>
      <div className="col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          住所 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.address ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="東京都渋谷区..."
          />
        </div>
        {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
      </div>
    </div>

    <div className="border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-violet-600" />
        緊急連絡先 <span className="text-red-500 text-sm">*</span>
      </h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            氏名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.emergency_name}
            onChange={(e) => setFormData({ ...formData, emergency_name: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.emergency_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="山田 太郎"
          />
          {errors.emergency_name && <p className="text-red-500 text-sm mt-1">{errors.emergency_name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            電話番号 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.emergency_phone}
            onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.emergency_phone ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="090-1234-5678"
          />
          {errors.emergency_phone && <p className="text-red-500 text-sm mt-1">{errors.emergency_phone}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            続柄 <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.emergency_relationship}
            onChange={(e) => setFormData({ ...formData, emergency_relationship: e.target.value })}
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 ${
              errors.emergency_relationship ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">選択してください</option>
            {EMERGENCY_RELATIONSHIPS.map((rel) => (
              <option key={rel} value={rel}>{rel}</option>
            ))}
          </select>
          {errors.emergency_relationship && <p className="text-red-500 text-sm mt-1">{errors.emergency_relationship}</p>}
        </div>
      </div>
    </div>

    <div className="border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <Heart className="w-5 h-5 text-violet-600" />
        健康情報（任意）
      </h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">既往歴・持病</label>
        <textarea
          value={formData.medical_history}
          onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          rows={3}
          placeholder="特になければ空欄で構いません"
        />
      </div>
    </div>

    <div className="border-t pt-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
        <Target className="w-5 h-5 text-violet-600" />
        その他（任意）
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">来店きっかけ</label>
          <select
            value={formData.referral_source}
            onChange={(e) => setFormData({ ...formData, referral_source: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">選択してください</option>
            {REFERRAL_SOURCES.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">目的・目標</label>
          <textarea
            value={formData.goals}
            onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            rows={2}
            placeholder="ダイエット、ストレス発散、体力づくりなど"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">運動経験</label>
          <select
            value={formData.exercise_experience}
            onChange={(e) => setFormData({ ...formData, exercise_experience: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="">選択してください</option>
            {EXERCISE_EXPERIENCES.map((exp) => (
              <option key={exp} value={exp}>{exp}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  </div>
  )
}

// ステップ4: プラン選択
const Step4Plan = ({ formData, setFormData, errors, plans }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-bold text-gray-900 mb-6">プラン選択</h2>

    <div className="grid grid-cols-2 gap-4">
      {plans.map((plan) => (
        <button
          key={plan.id}
          type="button"
          onClick={() => setFormData({ ...formData, plan: plan.id, plan_price: plan.price })}
          className={`relative p-6 rounded-xl border-2 text-left transition-all ${
            formData.plan === plan.id
              ? 'border-violet-600 bg-violet-50 ring-2 ring-violet-200'
              : 'border-gray-200 hover:border-violet-300'
          }`}
        >
          {plan.is_popular && (
            <span className="absolute -top-3 left-4 px-3 py-1 bg-violet-600 text-white text-xs font-medium rounded-full">
              人気
            </span>
          )}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
            </div>
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              formData.plan === plan.id
                ? 'border-violet-600 bg-violet-600'
                : 'border-gray-300'
            }`}>
              {formData.plan === plan.id && <Check className="w-4 h-4 text-white" />}
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-violet-600">
              ¥{plan.price.toLocaleString()}
            </span>
            <span className="text-sm text-gray-500">
              {plan.billing_type === 'monthly' ? '/月' : ''}
            </span>
          </div>
        </button>
      ))}
    </div>
    {errors.plan && <p className="text-red-500 text-sm mt-2">{errors.plan}</p>}
  </div>
)

// ステップ6: LINE友だち追加（QRコードのみ）
const Step6LINE = ({ formData, setFormData, errors, lineUserId, isLineClient }) => {
  const lineOfficialAccountUrl = process.env.NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL
  const lineOfficialAccountId = process.env.NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_ID

  // 友だち追加済みチェックボックス
  const handleFriendAdded = (checked) => {
    setFormData(prev => ({
      ...prev,
      line_friend_added: checked,
    }))
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">LINE友だち追加</h2>

      <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
        <p className="text-sm text-violet-800">
          LINE公式アカウントで会員証を表示して、入館・退館にご利用いただきます。
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-800 mb-1">LINEで会員証を表示できます</p>
            <p className="text-sm text-green-700">
              LINE公式アカウントで会員証QRコードを表示し、入館・退館にご利用ください。
            </p>
          </div>
        </div>
      </div>

      {/* QRコード表示 */}
      <div className={`border-2 rounded-xl p-6 transition-all ${
        formData.line_friend_added
          ? 'border-green-400 bg-green-50'
          : errors.line_friend ? 'border-red-300 bg-red-50' : 'border-gray-200'
      }`}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            <h3 className="text-lg font-bold text-gray-900">LINE公式アカウント</h3>
          </div>

          {/* QRコード */}
          {lineOfficialAccountId && (
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-xl shadow-inner border">
                <Image
                  src={`https://qr-official.line.me/gs/M_${lineOfficialAccountId.replace('@', '')}_GW.png`}
                  alt="LINE友だち追加QRコード"
                  width={160}
                  height={160}
                  className="w-40 h-40"
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            </div>
          )}

          <p className="text-sm text-gray-600 mb-4">
            スマートフォンでQRコードを読み取って<br />
            友だち追加してください
          </p>

          {/* スマホの場合のリンク */}
          {/* 友だち追加確認チェックボックス */}
          <div className="border-t pt-4">
            <label className="flex items-center justify-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.line_friend_added || false}
                onChange={(e) => handleFriendAdded(e.target.checked)}
                className="w-5 h-5 rounded border-green-400 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-700 font-medium">
                友だち追加しました
              </span>
            </label>
          </div>
        </div>
      </div>

      {errors.line_friend && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {errors.line_friend}
          </p>
        </div>
      )}

      {errors.registration && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {errors.registration}
          </p>
        </div>
      )}

    </div>
  )
}

// ステップ5: 同意確認
const Step5Agreement = ({ formData, setFormData, errors }) => {
  const agreements = [
    {
      key: 'agree_terms',
      title: '利用規約',
      description: 'サービスの利用条件、会員登録、支払い、キャンセルポリシー等を定めています。',
      href: '/terms',
      icon: FileText,
    },
    {
      key: 'agree_privacy',
      title: 'プライバシーポリシー',
      description: '個人情報の収集・利用目的、第三者提供、管理方法等を定めています。',
      href: '/privacy',
      icon: Shield,
    },
    {
      key: 'agree_disclaimer',
      title: '免責同意書',
      description: '運動に伴うリスク、健康状態の自己申告義務、緊急時対応等を定めています。',
      href: '/disclaimer',
      icon: AlertTriangle,
    },
  ]

  const allChecked = formData.agree_terms && formData.agree_privacy && formData.agree_disclaimer

  const handleCheckAll = () => {
    const newValue = !allChecked
    setFormData({
      ...formData,
      agree_terms: newValue,
      agree_privacy: newValue,
      agree_disclaimer: newValue,
    })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">規約への同意</h2>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-yellow-800">
          ご入会にあたり、以下の規約をお読みいただき、同意をお願いいたします。
          各規約のリンクをクリックすると、新しいタブで内容をご確認いただけます。
        </p>
      </div>

      <div className="space-y-4">
        {agreements.map((agreement) => {
          const Icon = agreement.icon
          const isChecked = formData[agreement.key]
          const hasError = errors[agreement.key]

          return (
            <div
              key={agreement.key}
              className={`border rounded-lg p-4 transition-all ${
                isChecked
                  ? 'border-violet-300 bg-violet-50'
                  : hasError
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  <input
                    type="checkbox"
                    id={agreement.key}
                    checked={isChecked}
                    onChange={(e) =>
                      setFormData({ ...formData, [agreement.key]: e.target.checked })
                    }
                    className="w-5 h-5 text-violet-600 border-gray-300 rounded focus:ring-violet-500 cursor-pointer"
                  />
                </div>
                <div className="flex-grow">
                  <label
                    htmlFor={agreement.key}
                    className="flex items-center gap-2 font-medium text-gray-900 cursor-pointer"
                  >
                    <Icon className="w-5 h-5 text-violet-600" />
                    {agreement.title}
                    <span className="text-red-500 text-sm">*</span>
                  </label>
                  <p className="text-sm text-gray-600 mt-1">{agreement.description}</p>
                  <a
                    href={agreement.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700 mt-2"
                  >
                    内容を確認する
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              {hasError && (
                <p className="text-red-500 text-sm mt-2 ml-9">{errors[agreement.key]}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* 一括チェック */}
      <div className="pt-4 border-t">
        <button
          type="button"
          onClick={handleCheckAll}
          className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700"
        >
          <div
            className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
              allChecked ? 'bg-violet-600 border-violet-600' : 'border-gray-300'
            }`}
          >
            {allChecked && <Check className="w-4 h-4 text-white" />}
          </div>
          すべての規約に同意する
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <p className="text-xs text-gray-500">
          同意いただいた日時は、電子記録として保存されます。
          入会後も、各規約は当サイトからいつでもご確認いただけます。
        </p>
      </div>
    </div>
  )
}

// ステップ7: 決済フォーム
const Step7Payment = ({ formData, memberId, onSuccess, plans }) => {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const selectedPlan = plans.find((p) => p.id === formData.plan)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsProcessing(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: formData.plan,
          memberData: formData,
          memberId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error)
      }

      const { clientSecret, paymentType, customerId } = data

      if (paymentType === 'setup') {
        const { error: setupError, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: `${formData.last_name} ${formData.first_name}`,
              email: formData.email,
            },
          },
        })

        if (setupError) {
          throw new Error(setupError.message)
        }

        const subRes = await fetch('/api/stripe/confirm-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setupIntentId: setupIntent.id,
            customerId,
            memberId,
            planId: formData.plan,
          }),
        })

        if (!subRes.ok) {
          const subData = await subRes.json()
          throw new Error(subData.error)
        }
      } else {
        const { error: paymentError } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement),
            billing_details: {
              name: `${formData.last_name} ${formData.first_name}`,
              email: formData.email,
            },
          },
        })

        if (paymentError) {
          throw new Error(paymentError.message)
        }

        await fetch('/api/stripe/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId,
            planId: formData.plan,
          }),
        })
      }

      onSuccess()
    } catch (err) {
      setError(err.message || '決済処理に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">お支払い情報</h2>

      <div className="bg-violet-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{selectedPlan?.name}</p>
            <p className="text-sm text-gray-500">{selectedPlan?.description}</p>
          </div>
          <p className="text-2xl font-bold text-violet-600">
            ¥{selectedPlan?.price.toLocaleString()}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CreditCard className="inline w-4 h-4 mr-1" />
            カード情報
          </label>
          <div className="p-4 border border-gray-300 rounded-lg bg-white">
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!stripe || isProcessing}
          className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              処理中...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              ¥{selectedPlan?.price.toLocaleString()} を支払う
            </>
          )}
        </button>
      </form>

      <p className="text-xs text-gray-500 text-center">
        お支払い情報はStripeにより安全に処理されます
      </p>
    </div>
  )
}

// メインコンポーネント
export default function StoreRegisterPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug

  const [step, setStep] = useState(0)
  const [memberId, setMemberId] = useState(null)
  const [memberNumber, setMemberNumber] = useState(null)
  const [qrCodeToken, setQrCodeToken] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [plans, setPlans] = useState([])
  const [isLoadingPlans, setIsLoadingPlans] = useState(true)
  const [store, setStore] = useState(null)
  const [storeError, setStoreError] = useState(null)
  const [lineUserId, setLineUserId] = useState(null)
  const [lineProfile, setLineProfile] = useState(null)
  const [isLiffReady, setIsLiffReady] = useState(false)
  const [isLineClient, setIsLineClient] = useState(false)

  // LIFF初期化（LINEアプリ内で開かれた場合にLINE User IDを取得）
  useEffect(() => {
    const initializeLiff = async () => {
      try {
        const liff = await initLiff(process.env.NEXT_PUBLIC_LIFF_REGISTRATION_ID)
        if (liff) {
          const inClient = isInLineApp()
          setIsLineClient(inClient)

          if (inClient && !isLoggedIn()) {
            // LINEアプリ内で未ログインの場合はログインを促す
            login()
            return
          }

          if (isLoggedIn()) {
            const profile = await getProfile()
            if (profile) {
              setLineUserId(profile.userId)
              setLineProfile(profile)
              console.log('LINE User ID取得:', profile.userId)
            }
          }
        }
      } catch (err) {
        console.log('LIFF初期化スキップ（通常ブラウザ）')
      } finally {
        setIsLiffReady(true)
      }
    }
    initializeLiff()
  }, [])

  // 店舗情報を取得
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/public/store?site_slug=${slug}&for_registration=true`)
        if (!res.ok) {
          if (res.status === 404) {
            setStoreError('notfound')
            return
          }
          throw new Error('店舗情報の取得に失敗しました')
        }
        const data = await res.json()
        setStore(data.store)
      } catch (err) {
        console.error('Store fetch error:', err)
        setStoreError(err.message)
      }
    }

    if (slug) {
      fetchStore()
    }
  }, [slug])

  // 料金プランをAPIから取得（店舗情報取得後）
  useEffect(() => {
    const fetchPlans = async () => {
      if (!store) return // 店舗情報がまだない場合はスキップ

      try {
        const res = await fetch(`/api/public/plans?store_id=${store.id}&for_registration=true`)
        const data = await res.json()
        if (res.ok && data.plans) {
          const sortedPlans = data.plans.sort((a, b) => a.sort_order - b.sort_order)
          setPlans(sortedPlans)
        }
      } catch (error) {
        console.error('料金プラン取得エラー:', error)
      } finally {
        setIsLoadingPlans(false)
      }
    }
    fetchPlans()
  }, [store])

  const [formData, setFormData] = useState({
    last_name: '',
    first_name: '',
    last_name_kana: '',
    first_name_kana: '',
    birth_date: '',
    gender: '',
    phone: '',
    email: '',
    postal_code: '',
    address: '',
    emergency_name: '',
    emergency_phone: '',
    emergency_relationship: '',
    medical_history: '',
    referral_source: '',
    goals: '',
    exercise_experience: '',
    plan: '',
    plan_price: 0,
    email_verified: false,
    email_verified_at: null,
    line_friend_added: false,
    agree_terms: false,
    agree_privacy: false,
    agree_disclaimer: false,
    parental_consent_agreed: false,
  })

  const validateStep1 = () => {
    const newErrors = {}
    if (!formData.last_name) newErrors.last_name = '姓を入力してください'
    if (!formData.first_name) newErrors.first_name = '名を入力してください'
    if (!formData.last_name_kana) newErrors.last_name_kana = 'セイを入力してください'
    if (!formData.first_name_kana) newErrors.first_name_kana = 'メイを入力してください'
    if (!formData.birth_date) newErrors.birth_date = '生年月日を入力してください'
    if (!formData.gender) newErrors.gender = '性別を選択してください'
    if (!formData.phone) newErrors.phone = '電話番号を入力してください'
    if (!formData.email) newErrors.email = 'メールアドレスを入力してください'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'メールアドレスの形式が正しくありません'
    }
    const age = calculateAge(formData.birth_date)
    if (age !== null && age < 18 && !formData.parental_consent_agreed) {
      newErrors.parental_consent = '保護者同意書のダウンロードと確認が必要です'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors = {}
    if (!formData.email_verified) {
      newErrors.verification = 'メールアドレスの認証が完了していません'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = () => {
    const newErrors = {}
    if (!formData.postal_code) newErrors.postal_code = '郵便番号を入力してください'
    if (!formData.address) newErrors.address = '住所を入力してください'
    if (!formData.emergency_name) newErrors.emergency_name = '緊急連絡先の氏名を入力してください'
    if (!formData.emergency_phone) newErrors.emergency_phone = '緊急連絡先の電話番号を入力してください'
    if (!formData.emergency_relationship) newErrors.emergency_relationship = '続柄を入力してください'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep4 = () => {
    const newErrors = {}
    if (!formData.plan) newErrors.plan = 'プランを選択してください'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep5 = () => {
    const newErrors = {}
    if (!formData.agree_terms) newErrors.agree_terms = '利用規約への同意が必要です'
    if (!formData.agree_privacy) newErrors.agree_privacy = 'プライバシーポリシーへの同意が必要です'
    if (!formData.agree_disclaimer) newErrors.agree_disclaimer = '免責同意書への同意が必要です'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep6 = () => {
    const newErrors = {}
    if (!formData.line_friend_added) {
      newErrors.line_friend = '友だち追加にチェックしてください'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (step === 0) {
      if (!validateStep1()) return
    } else if (step === 1) {
      if (!validateStep2()) return
    } else if (step === 2) {
      if (!validateStep3()) return
    } else if (step === 3) {
      if (!validateStep4()) return
    } else if (step === 4) {
      // 同意確認
      if (!validateStep5()) return

      // LIFF経由（LINE連携済み）の場合はLINE友だち追加ステップをスキップ
      if (lineUserId) {
        // 会員情報を仮登録
        setIsLoading(true)
        try {
          const res = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...formData,
              store_id: store?.id,
              line_user_id: lineUserId,
              agreed_at: new Date().toISOString(),
            }),
          })

          const data = await res.json()
          if (!res.ok) {
            if (data.error && data.error.includes('メールアドレス')) {
              setErrors({ email: data.error })
              setStep(1)
            } else {
              setErrors({ registration: data.error })
            }
            return
          }

          setMemberId(data.member.id)
          setMemberNumber(data.member.member_number)
          setQrCodeToken(data.member.qr_code_token)
        } catch (err) {
          setErrors({ registration: '登録に失敗しました' })
          return
        } finally {
          setIsLoading(false)
        }
        // LINE連携済みの場合はステップ5をスキップして直接決済へ
        setStep(6)
        setErrors({})
        return
      }
    } else if (step === 5) {
      // LINE友だち追加の確認（通常ブラウザの場合のみ到達）
      if (!validateStep6()) return

      // 会員情報を仮登録（店舗IDを含める）
      setIsLoading(true)
      try {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            store_id: store?.id,
            line_user_id: lineUserId,
            agreed_at: new Date().toISOString(),
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          if (data.error && data.error.includes('メールアドレス')) {
            setErrors({ email: data.error })
            setStep(1)
          } else {
            setErrors({ registration: data.error })
          }
          return
        }

        setMemberId(data.member.id)
        setMemberNumber(data.member.member_number)
        setQrCodeToken(data.member.qr_code_token)
      } catch (err) {
        setErrors({ registration: '登録に失敗しました' })
        return
      } finally {
        setIsLoading(false)
      }
    }

    setStep(step + 1)
    setErrors({})
  }

  const handleBack = () => {
    // LIFF経由の場合、step 6（決済）からstep 4（同意確認）に直接戻る
    if (lineUserId && step === 6) {
      setStep(4)
    } else {
      setStep(step - 1)
    }
    setErrors({})
  }

  const handlePaymentSuccess = () => {
    // 決済成功後、写真撮影ステップへ
    setStep(7)
  }

  const handlePhotoSaved = (photoUrl) => {
    // 写真保存後、完了ページへ
    const params = new URLSearchParams()
    params.set('memberNumber', memberNumber)
    if (qrCodeToken) {
      params.set('qrToken', qrCodeToken)
    }
    router.push(`/stores/${slug}/register/complete?${params.toString()}`)
  }

  const handleSkipPhoto = () => {
    // 写真をスキップして完了ページへ
    const params = new URLSearchParams()
    params.set('memberNumber', memberNumber)
    if (qrCodeToken) {
      params.set('qrToken', qrCodeToken)
    }
    router.push(`/stores/${slug}/register/complete?${params.toString()}`)
  }

  // 店舗が見つからない場合
  if (storeError === 'notfound') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">店舗が見つかりません</h1>
        <p className="text-gray-600">指定されたURLの店舗は存在しないか、公開されていません。</p>
      </div>
    )
  }

  // エラー
  if (storeError) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">エラーが発生しました</h1>
        <p className="text-gray-600">{storeError}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <Link href={`/stores/${slug}`}>
            <Image src="/logo.png" alt="FLOLIA" width={160} height={64} className="h-16 w-auto mx-auto" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">入会登録</h1>
          {store && (
            <div className="flex items-center justify-center gap-2 mt-2 text-gray-600">
              <Store className="w-4 h-4" />
              <span>{store.name}</span>
            </div>
          )}
        </div>

        {/* ステップインジケーター */}
        <StepIndicator
          currentStep={lineUserId && step > 4 ? step - 1 : step}
          totalSteps={lineUserId ? 7 : 8}
        />

        {/* 料金プラン読み込み中 */}
        {(isLoadingPlans || !store) && (
          <div className="bg-white rounded-2xl shadow-xl p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
            <span className="ml-3 text-gray-600">読み込み中...</span>
          </div>
        )}

        {/* フォームカード */}
        {!isLoadingPlans && store && (
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 0 && (
            <Step1BasicInfo
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            />
          )}

          {step === 1 && (
            <Step2Verification
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            />
          )}

          {step === 2 && (
            <Step3Additional
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            />
          )}

          {step === 3 && (
            <Step4Plan
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              plans={plans}
            />
          )}

          {step === 4 && (
            <Step5Agreement
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            />
          )}

          {step === 5 && !lineUserId && (
            <Step6LINE
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              lineUserId={lineUserId}
              isLineClient={isLineClient}
            />
          )}

          {step === 6 && (
            <Elements stripe={stripePromise}>
              <Step7Payment
                formData={formData}
                memberId={memberId}
                onSuccess={handlePaymentSuccess}
                plans={plans}
              />
            </Elements>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <PhotoCapture
                memberId={memberId}
                onPhotoSaved={handlePhotoSaved}
              />

              {/* スキップボタン */}
              <div className="border-t pt-6">
                <button
                  type="button"
                  onClick={handleSkipPhoto}
                  className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm"
                >
                  後で撮影する（スキップ）
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  写真は後から管理画面で追加することもできます
                </p>
              </div>
            </div>
          )}

          {/* ナビゲーションボタン */}
          {step < 6 && (
            <div className="flex justify-between mt-8 pt-6 border-t">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-3 text-gray-600 hover:text-gray-900 flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  戻る
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading || (step === 5 && !formData.line_friend_added)}
                className="px-8 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    次へ
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        )}

      </div>
    </div>
  )
}
