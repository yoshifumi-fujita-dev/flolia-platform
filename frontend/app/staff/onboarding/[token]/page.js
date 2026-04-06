'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  FileText,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  User,
  Mail,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  Shield,
  Share2,
  X,
  Check,
  BookOpen,
} from 'lucide-react'

const STEPS = [
  { id: 1, title: '情報確認', icon: User },
  { id: 2, title: '社内規程同意', icon: FileText },
  { id: 3, title: 'LINE連携', icon: MessageCircle },
  { id: 4, title: 'パスワード', icon: Lock },
  { id: 5, title: '完了', icon: CheckCircle },
]

const DOCUMENT_TYPE_CONFIG = {
  work_rules_consent: {
    label: '就業規則同意書',
    icon: BookOpen,
    description: '就業規則の遵守、勤務時間、服務規律等に関する同意書です。',
  },
  confidentiality: {
    label: '機密保持誓約書',
    icon: Shield,
    description: '業務上知り得た機密情報の取扱いに関する誓約書です。',
  },
  sns_policy: {
    label: 'SNSポリシー同意書',
    icon: Share2,
    description: 'SNS利用に関するガイドラインへの同意書です。',
  },
  employment_contract: {
    label: '雇用契約書',
    icon: FileText,
    description: '雇用条件に関する契約書です。',
  },
}

const EMPLOYMENT_TYPE_LABELS = {
  full_time: '正社員',
  part_time: 'パートタイム',
  contract: '契約社員',
  contractor: '業務委託',
  instructor: 'インストラクター',
  executive: '役員',
}

export default function StaffOnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // データ
  const [invitation, setInvitation] = useState(null)
  const [staff, setStaff] = useState(null)
  const [contractTemplate, setContractTemplate] = useState(null)
  const [documents, setDocuments] = useState([])

  // 同意チェック状態
  const [documentAgreements, setDocumentAgreements] = useState({})
  const [viewingDocument, setViewingDocument] = useState(null)

  // パスワード
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // 招待情報を取得
  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const res = await fetch(`/api/staff-onboarding/${token}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || '招待情報の取得に失敗しました')
          return
        }

        setInvitation(data.invitation)
        setStaff(data.staff)
        setContractTemplate(data.contractTemplate)
        setDocuments(data.documents || [])

        // 同意状態を初期化（署名済み文書はチェック済みにする）
        const agreements = {}
        for (const doc of data.documents || []) {
          agreements[doc.id] = doc.signed || false
        }
        setDocumentAgreements(agreements)

        // 既存のステータスに応じてステップを設定
        if (data.staff?.onboarding_status === 'line_linked') {
          // LINE連携済み → パスワード設定ステップへ
          setStep(4)
        } else if (data.staff?.onboarding_status === 'contract_signed') {
          // 契約署名済み → LINE連携ステップへ
          setStep(3)
        }
      } catch (err) {
        setError('招待情報の取得に失敗しました')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchInvitation()
    }
  }, [token])

  // 全書類に同意して送信
  const handleAgreeDocuments = async () => {
    const unsignedDocs = documents.filter((d) => !d.signed)
    const allAgreed = unsignedDocs.every((d) => documentAgreements[d.id])

    if (!allAgreed) {
      setError('すべての書類に同意してください')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      for (const doc of unsignedDocs) {
        const res = await fetch(`/api/staff-onboarding/${token}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signature_typed_name: staff?.name || '',
            contract_template_id: doc.id,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || '同意の記録に失敗しました')
        }
      }

      // LINE連携ステップへ
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // LINE連携ステータス確認
  const checkLineLinked = async () => {
    try {
      const res = await fetch(`/api/staff-onboarding/${token}`)
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'LINE連携状態の確認に失敗しました')
        return false
      }

      if (data.staff?.line_user_id) {
        setStaff(data.staff)
        setStep(4)
        return true
      }

      if (data.staff?.onboarding_status === 'line_linked') {
        setStaff(data.staff)
        setStep(4)
        return true
      }

      return false
    } catch (err) {
      setError('LINE連携状態の確認中にエラーが発生しました')
      return false
    }
  }

  // LINE連携用URLを生成
  const getLineLinkUrl = () => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_STAFF_ID || process.env.NEXT_PUBLIC_LIFF_ID
    if (!liffId) return null
    const baseUrl = `https://liff.line.me/${liffId}`
    const params = new URLSearchParams({
      token: token,
      name: staff?.name || '',
    })
    return `${baseUrl}?${params.toString()}`
  }

  // オンボーディング完了
  const handleComplete = async () => {
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/staff-onboarding/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '登録に失敗しました')
      }

      // 完了ステップへ
      setStep(5)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // 同意チェック操作
  const unsignedDocs = documents.filter((d) => !d.signed)
  const allChecked = unsignedDocs.length > 0 && unsignedDocs.every((d) => documentAgreements[d.id])

  const handleCheckAll = () => {
    const newValue = !allChecked
    const newAgreements = { ...documentAgreements }
    for (const doc of unsignedDocs) {
      newAgreements[doc.id] = newValue
    }
    setDocumentAgreements(newAgreements)
  }

  // ローディング表示
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">読み込み中...</p>
        </div>
      </div>
    )
  }

  // エラー表示（招待無効など）
  if (error && !staff) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">エラー</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white text-center">FLOLIA</h1>
          <p className="text-violet-200 text-center mt-1">従業員登録</p>
        </div>
      </div>

      {/* ステップインジケーター */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex justify-between">
            {STEPS.map((s, index) => {
              const Icon = s.icon
              const isActive = step === s.id
              const isComplete = step > s.id

              return (
                <div key={s.id} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {index > 0 && (
                      <div
                        className={`flex-1 h-0.5 ${
                          isComplete ? 'bg-violet-500' : 'bg-gray-700'
                        }`}
                      />
                    )}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isComplete
                          ? 'bg-violet-500 text-white'
                          : isActive
                          ? 'bg-violet-600 text-white ring-4 ring-violet-500/30'
                          : 'bg-gray-700 text-gray-500'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    {index < STEPS.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 ${
                          isComplete ? 'bg-violet-500' : 'bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      isActive || isComplete ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: 情報確認 */}
        {step === 1 && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-6 h-6" />
              登録情報の確認
            </h2>
            <p className="text-gray-400 mb-6">
              以下の情報でよろしければ「次へ」をクリックしてください。
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">氏名</p>
                  <p className="text-white font-medium">{staff?.name}</p>
                  {staff?.name_kana && (
                    <p className="text-gray-500 text-sm">{staff.name_kana}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">メールアドレス</p>
                  <p className="text-white">{staff?.email}</p>
                </div>
              </div>

              {staff?.phone && (
                <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">電話番号</p>
                    <p className="text-white">{staff.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-gray-700/50 rounded-lg">
                <Briefcase className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">雇用形態</p>
                  <p className="text-white">
                    {EMPLOYMENT_TYPE_LABELS[staff?.employment_type] || staff?.employment_type}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition"
              >
                次へ
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 社内規程同意（チェックボックス形式） */}
        {step === 2 && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              社内規程への同意
            </h2>

            <div className="p-4 bg-yellow-900/30 border border-yellow-600/30 rounded-lg mb-6">
              <p className="text-sm text-yellow-300">
                以下の社内規程をお読みいただき、同意をお願いいたします。
                「内容を確認する」をクリックすると、各書類の内容をご確認いただけます。
              </p>
            </div>

            <div className="space-y-4">
              {documents.map((doc) => {
                const config = DOCUMENT_TYPE_CONFIG[doc.document_type] || {
                  label: doc.name,
                  icon: FileText,
                  description: '',
                }
                const DocIcon = config.icon
                const isChecked = documentAgreements[doc.id] || false
                const isSigned = doc.signed

                return (
                  <div
                    key={doc.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isChecked
                        ? 'border-violet-500/50 bg-violet-600/10'
                        : 'border-gray-700 bg-gray-700/30'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <input
                          type="checkbox"
                          id={`doc-${doc.id}`}
                          checked={isChecked}
                          disabled={isSigned}
                          onChange={(e) =>
                            setDocumentAgreements({
                              ...documentAgreements,
                              [doc.id]: e.target.checked,
                            })
                          }
                          className="w-5 h-5 text-violet-500 border-gray-600 rounded bg-gray-700 focus:ring-violet-500 cursor-pointer disabled:opacity-60"
                        />
                      </div>
                      <div className="flex-grow">
                        <label
                          htmlFor={`doc-${doc.id}`}
                          className="flex items-center gap-2 font-medium text-white cursor-pointer"
                        >
                          <DocIcon className="w-5 h-5 text-violet-400" />
                          {config.label}
                          {isSigned && (
                            <span className="text-xs px-2 py-0.5 bg-green-600/30 text-green-400 rounded">
                              同意済み
                            </span>
                          )}
                        </label>
                        {config.description && (
                          <p className="text-sm text-gray-400 mt-1">{config.description}</p>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewingDocument(doc)}
                          className="inline-flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 mt-2"
                        >
                          内容を確認する
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 一括チェック */}
            {unsignedDocs.length > 1 && (
              <div className="pt-4 mt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={handleCheckAll}
                  className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
                >
                  <div
                    className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                      allChecked ? 'bg-violet-600 border-violet-600' : 'border-gray-500'
                    }`}
                  >
                    {allChecked && <Check className="w-4 h-4 text-white" />}
                  </div>
                  すべての規約に同意する
                </button>
              </div>
            )}

            <div className="bg-gray-700/30 rounded-lg p-4 mt-6">
              <p className="text-xs text-gray-500">
                同意いただいた日時・IPアドレス等は、電子記録として保存されます。
              </p>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                <ChevronLeft className="w-5 h-5" />
                戻る
              </button>
              <button
                onClick={handleAgreeDocuments}
                disabled={submitting || !allChecked}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                同意して次へ
              </button>
            </div>
          </div>
        )}

        {/* Step 3: LINE連携 */}
        {step === 3 && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              LINE連携
            </h2>
            <p className="text-gray-400 mb-6">
              FLOLIA PARTNERのLINE公式アカウントと連携してください。<br />
              重要な通知をLINEで受け取ることができます。
            </p>

            <div className="space-y-6">
              {/* ステップ1: 友だち追加 */}
              <div className="bg-gray-700/50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                  <h3 className="text-white font-medium">FLOLIA PARTNER を友だち追加</h3>
                </div>

                <div className="text-center">
                  {/* 友だち追加QRコード */}
                  <div className="bg-white rounded-lg p-4 inline-block mb-4">
                    {process.env.NEXT_PUBLIC_LINE_PARTNER_ID ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://line.me/R/ti/p/${process.env.NEXT_PUBLIC_LINE_PARTNER_ID}`)}`}
                        alt="FLOLIA PARTNER 友だち追加QR"
                        className="w-36 h-36 mx-auto"
                      />
                    ) : (
                      <div className="w-36 h-36 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                        QR準備中
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    QRコードを読み取って友だち追加してください
                  </p>

                  {/* 友だち追加ボタン */}
                  {process.env.NEXT_PUBLIC_LINE_PARTNER_ID && (
                    <a
                      href={`https://line.me/R/ti/p/${process.env.NEXT_PUBLIC_LINE_PARTNER_ID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#00B900] text-white rounded-lg hover:bg-[#00A000] transition text-sm"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                      </svg>
                      友だち追加する
                    </a>
                  )}
                </div>
              </div>

              {/* ステップ2: LINE連携 */}
              <div className="bg-gray-700/50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-violet-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                  <h3 className="text-white font-medium">アカウント連携</h3>
                </div>

                <div className="text-center">
                  <div className="bg-white rounded-lg p-4 inline-block mb-4">
                    {/* QRコード（LIFF URLをQRコード化） */}
                    {getLineLinkUrl() && (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(getLineLinkUrl())}`}
                        alt="LINE連携QRコード"
                        className="w-36 h-36 mx-auto"
                      />
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mb-3">
                    友だち追加後、このQRコードで連携してください
                  </p>

                  {/* 直接リンク（モバイル向け） */}
                  {getLineLinkUrl() && (
                    <a
                      href={getLineLinkUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      LINE連携する
                    </a>
                  )}
                </div>
              </div>

              {/* 連携手順 */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">連携手順</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-400">
                  <li><span className="text-green-400">まず</span> FLOLIA PARTNER を友だち追加する</li>
                  <li><span className="text-violet-400">次に</span> アカウント連携のQRコードを読み取る</li>
                  <li>「LINE連携する」ボタンをタップ</li>
                  <li>連携完了後、このページで「次へ」をクリック</li>
                </ol>
              </div>

              {/* 注意事項 */}
              <div className="p-4 bg-yellow-900/30 border border-yellow-600/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  <strong>注意:</strong> 友だち追加とLINE連携の両方が必要です。連携が完了するまで次のステップに進めません。
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                <ChevronLeft className="w-5 h-5" />
                戻る
              </button>
              <button
                onClick={async () => {
                  setSubmitting(true)
                  const linked = await checkLineLinked()
                  setSubmitting(false)
                  if (!linked) {
                    setError('LINE連携がまだ完了していません。QRコードを読み取ってLINE連携を行ってください。')
                  }
                }}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <ChevronRight className="w-5 h-5" />
                )}
                連携を確認して次へ
              </button>
            </div>
          </div>
        )}

        {/* Step 4: パスワード設定 */}
        {step === 4 && (
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6" />
              パスワード設定
            </h2>
            <p className="text-gray-400 mb-6">
              管理画面にログインするためのパスワードを設定してください。
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  パスワード（8文字以上）
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 pr-12"
                    placeholder="パスワードを入力"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  パスワード（確認）
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                  placeholder="パスワードを再入力"
                />
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-sm">パスワードが一致しません</p>
              )}

              {password && password.length < 8 && (
                <p className="text-yellow-400 text-sm">8文字以上で入力してください</p>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleComplete}
                disabled={submitting || password.length < 8 || password !== confirmPassword}
                className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                登録を完了する
              </button>
            </div>
          </div>
        )}

        {/* Step 5: 完了 */}
        {step === 5 && (
          <div className="bg-gray-800 rounded-xl p-8 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              登録完了
            </h2>
            <p className="text-gray-400 mb-8">
              従業員登録が完了しました。<br />
              設定したパスワードで管理画面にログインできます。
            </p>

            <a
              href="/backoffice"
              className="inline-flex items-center gap-2 px-8 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition"
            >
              管理画面へ
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        )}
      </div>

      {/* 書類内容モーダル */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">
                {DOCUMENT_TYPE_CONFIG[viewingDocument.document_type]?.label || viewingDocument.name}
              </h3>
              <button
                onClick={() => setViewingDocument(null)}
                className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div
                className="bg-white text-gray-900 rounded-lg p-6 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: viewingDocument.content }}
              />
            </div>
            <div className="p-4 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => setViewingDocument(null)}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
