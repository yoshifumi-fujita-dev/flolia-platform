'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// パーティクルアニメーション
const LightParticles = () => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 5,
    duration: 3 + Math.random() * 4,
    size: 4 + Math.random() * 8,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full opacity-0"
          style={{
            left: `${p.left}%`,
            bottom: '-20px',
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: 'radial-gradient(circle, rgba(167, 139, 250, 0.8) 0%, rgba(192, 132, 252, 0) 70%)',
            animation: `floatUp ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) scale(1.5); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// 金額フォーマット
const formatSalary = (amount) => {
  if (!amount) return null
  return Math.floor(amount / 10000)
}

// デフォルト設定
const defaultSettings = {
  hero_title: 'AIにミットは持てない。',
  hero_subtitle: 'AIが進化するほど、人の価値は「身体と向き合う力」に宿る。',
  hero_description: 'ロボットが相手なら、サンドバッグでいい。でも――目の前の人を笑顔にするのは、人にしかできない。',
  hero_video_url: null, // 背景動画URL（nullの場合はグラデーション背景）
  value_title: 'この仕事には価値がある',
  value_description: '汗と呼吸、そして声掛け。相手の目を見て、限界を一歩超えさせること。',
  value_highlight: 'AIにはできない。マニュアルにも置き換えられない仕事。',
  ai_section_title: 'AI時代に、\n最後まで残る\n身体の仕事',
  ai_section_description: 'キックボクシングインストラクターは、人にしかできないコーチングがある仕事です。',
  ai_section_highlight: 'ミットを持つことは、誰かの自信を支え、人生を前に進めること。',
  compensation_title: 'その価値には、正当な報酬がある。',
  compensation_subtitle: 'プロとして、対価を得る仕事です。',
  fulltime_salary_min: 250000,
  fulltime_salary_max: null,
  fulltime_benefits: ['経験・スキルに応じて優遇', '昇給制度あり', '社会保険完備'],
  parttime_hourly_min: 1500,
  parttime_hourly_max: null,
  parttime_benefits: ['週3日〜OK', 'シフト相談可', '正社員登用あり'],
  job_title: 'キックボクシングインストラクター',
  employment_types: ['正社員', 'アルバイト・パート'],
  work_location: 'FLOLIA 辻堂店（神奈川県藤沢市）',
  work_hours: 'シフト制（営業時間内）',
  work_hours_note: '※週3日〜応相談',
  benefits: ['交通費支給', '社会保険完備（正社員）', '研修制度あり', 'スタジオ利用無料'],
  requirements: ['人と向き合うことが好きな方', '運動・フィットネスに興味がある方', '誰かの成長を喜べる方', '格闘技経験者（未経験でも可）'],
  closing_title: 'この仕事は、代替されない。',
  closing_description: 'あなたの身体、あなたの声、あなたの熱量が、誰かを変える。',
}

// メインコンテンツコンポーネント（useSearchParamsを使用）
function CareersContent() {
  const searchParams = useSearchParams()
  const isPreview = searchParams.get('preview') === 'true'

  const [settings, setSettings] = useState(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)

  // 設定を取得
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // プレビューモードの場合は非公開の設定も取得
        const url = isPreview ? '/api/public/careers?preview=true' : '/api/public/careers'
        const res = await fetch(url)

        // 404の場合は非公開（ページなし）
        if (res.status === 404) {
          setNotFound(true)
          return
        }

        const data = await res.json()
        if (res.ok && data.settings) {
          setSettings({ ...defaultSettings, ...data.settings })
        }
      } catch (error) {
        console.error('Failed to fetch career settings:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [isPreview])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          type: 'careers',
          subject: '【採用応募】' + formData.name + '様',
        }),
      })

      if (res.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', phone: '', message: '' })
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Submit error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    )
  }

  // 非公開（404）の場合
  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">ページが見つかりません</h1>
        <p className="text-gray-600 mb-6">このページは存在しないか、現在公開されていません。</p>
        <Link
          href="/"
          className="flex items-center gap-2 px-6 py-3 bg-violet-500 text-white rounded-full hover:bg-violet-600 transition-colors"
        >
          トップページへ戻る
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white font-zen">
      {/* プレビューバナー */}
      {isPreview && (
        <>
          <head>
            <meta name="robots" content="noindex, nofollow" />
          </head>
          <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-900 text-center py-2 px-4 text-sm font-medium shadow-lg">
            プレビューモード - このページは非公開です。一般ユーザーには表示されません。
          </div>
        </>
      )}
      {/* ヘッダー */}
      <nav className={`fixed left-0 right-0 z-50 px-4 md:px-6 py-2 bg-white/90 backdrop-blur-md border-b border-gray-100 ${isPreview ? 'top-10' : 'top-0'}`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-16 md:h-20 w-auto" priority />
          </Link>
          <Link
            href="/stores/tsujido"
            className="px-4 py-2 text-sm text-violet-600 hover:text-violet-800 transition-colors"
          >
            スタジオへ戻る
          </Link>
        </div>
      </nav>

      {/* ヒーローセクション */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-900">
        {/* 背景動画 */}
        {settings.hero_video_url && (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={settings.hero_video_url} type="video/mp4" />
          </video>
        )}
        {!settings.hero_video_url && <LightParticles />}
        <div className="absolute inset-0 bg-black/50" />

        <div className="relative z-10 text-center px-6 py-32 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-8 leading-tight">
            <span className="block text-2xl md:text-3xl font-light mb-4 text-violet-200">
              {settings.hero_title}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-8 max-w-2xl mx-auto">
            {settings.hero_subtitle?.split('「').map((part, i) =>
              i === 0 ? part : (
                <span key={i}>
                  <span className="text-violet-300 font-semibold">「{part.split('」')[0]}」</span>
                  {part.split('」')[1]}
                </span>
              )
            )}
          </p>

          <p className="text-base md:text-lg text-white/80 leading-relaxed mb-12 max-w-xl mx-auto whitespace-pre-line">
            {settings.hero_description}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#apply"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-violet-700 rounded-full font-semibold hover:bg-violet-50 transition-all shadow-xl hover:shadow-2xl"
            >
              応募する
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </a>
            <a
              href="#apply"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-transparent border-2 border-white/50 text-white rounded-full font-semibold hover:bg-white/10 transition-all"
            >
              まずは話を聞いてみる
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* 価値観セクション */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              {settings.value_title}
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-violet-500 to-purple-500 mx-auto rounded-full" />
          </div>

          <div className="space-y-8 text-lg text-gray-700 leading-relaxed">
            <p className="text-center whitespace-pre-line">
              {settings.value_description}
            </p>

            <p className="text-center text-xl font-medium text-violet-700 whitespace-pre-line">
              {settings.value_highlight}
            </p>
          </div>
        </div>
      </section>

      {/* 仕事の価値セクション */}
      <section className="py-24 px-6 bg-gradient-to-b from-violet-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 whitespace-pre-line">
                {settings.ai_section_title}
              </h2>
              <p className="text-gray-600 leading-relaxed mb-6">
                {settings.ai_section_description}
              </p>
              <p className="text-lg text-violet-700 font-medium whitespace-pre-line">
                {settings.ai_section_highlight}
              </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-xl border border-violet-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                求める人材
              </h3>
              <ul className="space-y-4 text-gray-600">
                {(settings.requirements || []).map((req, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 報酬セクション */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              {settings.compensation_title}
            </h2>
            <p className="text-lg text-gray-600">
              {settings.compensation_subtitle}
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-violet-500 to-purple-500 mx-auto rounded-full mt-6" />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 正社員 */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm mb-4">正社員</span>
                <div className="mb-6">
                  <p className="text-sm text-violet-200 mb-1">月収</p>
                  <p className="text-4xl md:text-5xl font-bold">
                    {formatSalary(settings.fulltime_salary_min)}
                    {settings.fulltime_salary_max && `〜${formatSalary(settings.fulltime_salary_max)}`}
                    <span className="text-2xl">万円{!settings.fulltime_salary_max && '〜'}</span>
                  </p>
                </div>
                <ul className="space-y-3 text-sm text-white/90">
                  {(settings.fulltime_benefits || []).map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* アルバイト */}
            <div className="bg-white border-2 border-violet-200 rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="relative">
                <span className="inline-block px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm mb-4">アルバイト・パート</span>
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-1">時給</p>
                  <p className="text-4xl md:text-5xl font-bold text-violet-700">
                    {settings.parttime_hourly_min?.toLocaleString()}
                    {settings.parttime_hourly_max && `〜${settings.parttime_hourly_max.toLocaleString()}`}
                    <span className="text-2xl">円{!settings.parttime_hourly_max && '〜'}</span>
                  </p>
                </div>
                <ul className="space-y-3 text-sm text-gray-600">
                  {(settings.parttime_benefits || []).map((benefit, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* 補足メッセージ */}
          <div className="mt-12 text-center">
            <p className="text-gray-500 text-sm">
              ※経験・能力により優遇いたします。詳細は面談時にご説明します。
            </p>
          </div>
        </div>
      </section>

      {/* 募集要項セクション */}
      <section className="py-24 px-6 bg-violet-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              募集要項
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-violet-500 to-purple-500 mx-auto rounded-full" />
          </div>

          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-lg">
            <dl className="space-y-6">
              <div className="grid md:grid-cols-4 gap-2 md:gap-4 pb-6 border-b border-gray-100">
                <dt className="font-semibold text-gray-800">職種</dt>
                <dd className="md:col-span-3 text-gray-600">{settings.job_title}</dd>
              </div>
              <div className="grid md:grid-cols-4 gap-2 md:gap-4 pb-6 border-b border-gray-100">
                <dt className="font-semibold text-gray-800">雇用形態</dt>
                <dd className="md:col-span-3 text-gray-600">{(settings.employment_types || []).join(' / ')}</dd>
              </div>
              <div className="grid md:grid-cols-4 gap-2 md:gap-4 pb-6 border-b border-gray-100">
                <dt className="font-semibold text-gray-800">勤務地</dt>
                <dd className="md:col-span-3 text-gray-600">{settings.work_location || 'FLOLIA 辻堂店（神奈川県藤沢市）'}</dd>
              </div>
              <div className="grid md:grid-cols-4 gap-2 md:gap-4 pb-6 border-b border-gray-100">
                <dt className="font-semibold text-gray-800">勤務時間</dt>
                <dd className="md:col-span-3 text-gray-600">
                  {settings.work_hours}<br />
                  {settings.work_hours_note && <span className="text-sm text-gray-500">{settings.work_hours_note}</span>}
                </dd>
              </div>
              <div className="grid md:grid-cols-4 gap-2 md:gap-4">
                <dt className="font-semibold text-gray-800">待遇</dt>
                <dd className="md:col-span-3 text-gray-600">
                  <ul className="space-y-1">
                    {(settings.benefits || []).map((benefit, index) => (
                      <li key={index}>・{benefit}</li>
                    ))}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* クロージングメッセージ */}
      <section className="py-24 px-6 bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-900 relative overflow-hidden">
        <LightParticles />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
            {settings.closing_title}
          </h2>
          <p className="text-xl text-white/90 leading-relaxed whitespace-pre-line">
            {settings.closing_description?.split(/(<[^>]+>)/g).map((part, i) => {
              if (part.startsWith('<') && part.endsWith('>')) {
                return <span key={i} className="text-violet-300 font-semibold">{part.slice(1, -1)}</span>
              }
              return part
            })}
          </p>
        </div>
      </section>

      {/* 応募・問い合わせフォーム */}
      <section id="apply" className="py-24 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              応募・お問い合わせ
            </h2>
            <p className="text-gray-600 mb-4">
              ご興味のある方は、お気軽にお問い合わせください。
            </p>
            <p className="text-violet-600 font-medium">
              「まずは話を聞いてみたい」「見学したい」など、<br className="hidden sm:inline" />
              カジュアルなご相談も大歓迎です。
            </p>
          </div>

          {submitStatus === 'success' ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green-800 mb-2">送信完了しました</h3>
              <p className="text-green-700">
                ご応募ありがとうございます。<br />
                担当者より折り返しご連絡いたします。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  お名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
                  placeholder="山田 太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  電話番号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all"
                  placeholder="090-1234-5678"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メッセージ
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 transition-all resize-none"
                  placeholder="ご質問やご要望など、自由にご記入ください"
                />
              </div>

              {submitStatus === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                  送信に失敗しました。時間をおいて再度お試しください。
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-violet-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '送信中...' : '送信する'}
              </button>
              <p className="text-center text-sm text-gray-500 mt-4">
                ※応募・お問い合わせどちらでもお気軽にどうぞ
              </p>
            </form>
          )}
        </div>
      </section>

      {/* フッター */}
      <footer className="py-12 bg-gray-50 border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col items-center gap-6">
            <Link href="/">
              <Image src="/logo.png" alt="FLOLIA" width={192} height={64} className="h-16 w-auto" />
            </Link>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
              <Link href="/stores/tsujido" className="hover:text-violet-600 transition-colors">スタジオ</Link>
              <span className="text-gray-300">|</span>
              <Link href="/terms" className="hover:text-violet-600 transition-colors">利用規約</Link>
              <span className="text-gray-300">|</span>
              <Link href="/privacy" className="hover:text-violet-600 transition-colors">プライバシーポリシー</Link>
              <span className="text-gray-300">|</span>
              <Link href="/contact" className="hover:text-violet-600 transition-colors">お問い合わせ</Link>
            </div>
            <p className="text-gray-400 text-sm">
              © 2025 FLOLIA Kickboxing Studio. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Suspenseでラップしたエクスポート
export default function CareersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    }>
      <CareersContent />
    </Suspense>
  )
}
