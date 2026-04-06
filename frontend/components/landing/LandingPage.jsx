'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import BookingModal from '@/components/booking/BookingModal'
import ScheduleDetailModal from '@/components/schedule/ScheduleDetailModal'
import { I18nProvider, useI18n } from '@/lib/contexts/I18nContext'
import { translations } from '@/lib/i18n/translations'

// ============================================
// Language Switcher Component (head CONCIERGE style)
// ============================================
const LanguageSwitcher = () => {
  const { locale, setLocale, t } = useI18n()

  return (
    <div className="hidden md:flex flex-col gap-1">
      <button
        onClick={() => setLocale('ja')}
        className={`px-3 py-1 text-xs rounded border transition-all ${
          locale === 'ja'
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
        }`}
      >
        {t('lang.ja')}
      </button>
      <button
        onClick={() => setLocale('en')}
        className={`px-3 py-1 text-xs rounded border transition-all ${
          locale === 'en'
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
        }`}
      >
        {t('lang.en')}
      </button>
    </div>
  )
}

// ============================================
// Decorative Components
// ============================================
const LightParticles = () => {
  const particles = Array.from({ length: 30 }, (_, i) => ({
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

const FlowerPetals = () => {
  const petals = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 6,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {petals.map((p) => (
        <div
          key={p.id}
          className="absolute opacity-0"
          style={{
            left: `${p.left}%`,
            top: '-30px',
            animation: `petalFall ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        >
          <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
            <ellipse cx="10" cy="12" rx="8" ry="11" fill="url(#petalGrad)" opacity="0.6" />
            <defs>
              <linearGradient id="petalGrad" x1="10" y1="0" x2="10" y2="24">
                <stop stopColor="#F5D0FE" />
                <stop offset="1" stopColor="#E9D5FF" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      ))}
      <style>{`
        @keyframes petalFall {
          0% { transform: translateY(0) rotate(0deg) translateX(0); opacity: 0; }
          10% { opacity: 0.7; }
          50% { transform: translateY(50vh) rotate(180deg) translateX(30px); }
          90% { opacity: 0.5; }
          100% { transform: translateY(100vh) rotate(360deg) translateX(-20px); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

const BloomingFlowers = () => {
  const flowers = [
    { left: '5%', top: '10%', size: 60, delay: 0, duration: 4 },
    { left: '15%', top: '60%', size: 45, delay: 1, duration: 5 },
    { left: '25%', top: '30%', size: 35, delay: 2, duration: 4.5 },
    { left: '35%', top: '80%', size: 50, delay: 0.5, duration: 5.5 },
    { left: '45%', top: '15%', size: 40, delay: 1.5, duration: 4 },
    { left: '55%', top: '70%', size: 55, delay: 2.5, duration: 5 },
    { left: '65%', top: '25%', size: 38, delay: 0.8, duration: 4.8 },
    { left: '75%', top: '55%', size: 48, delay: 1.8, duration: 5.2 },
    { left: '85%', top: '40%', size: 42, delay: 2.2, duration: 4.2 },
    { left: '92%', top: '75%', size: 52, delay: 0.3, duration: 5.8 },
    { left: '10%', top: '85%', size: 32, delay: 3, duration: 4.5 },
    { left: '50%', top: '45%', size: 65, delay: 1.2, duration: 6 },
    { left: '80%', top: '10%', size: 36, delay: 2.8, duration: 4.3 },
    { left: '30%', top: '50%', size: 44, delay: 0.7, duration: 5.3 },
    { left: '70%', top: '85%', size: 38, delay: 1.7, duration: 4.7 },
  ]

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {flowers.map((flower, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: flower.left,
            top: flower.top,
            width: flower.size,
            height: flower.size,
            animation: `bloom ${flower.duration}s ease-in-out ${flower.delay}s infinite`,
          }}
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }}
          >
            {[0, 60, 120, 180, 240, 300].map((rotation, j) => (
              <ellipse
                key={j}
                cx="50"
                cy="30"
                rx="15"
                ry="25"
                fill={`rgba(255, 255, 255, ${0.15 + (j % 3) * 0.05})`}
                transform={`rotate(${rotation} 50 50)`}
              />
            ))}
            <circle cx="50" cy="50" r="12" fill="rgba(255, 200, 255, 0.3)" />
            <circle cx="50" cy="50" r="6" fill="rgba(255, 255, 255, 0.4)" />
          </svg>
        </div>
      ))}
      <style jsx>{`
        @keyframes bloom {
          0%, 100% {
            transform: scale(0.8) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2) rotate(180deg);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
}

// ============================================
// Navigation
// ============================================
const Navigation = ({ onBookingClick, store, storeSlug }) => {
  const { t } = useI18n()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-2 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto flex items-center gap-4 md:gap-8 lg:gap-12">
        <Link href={storeSlug ? `/stores/${storeSlug}` : '/'} className="flex items-center flex-shrink-0">
          <Image src="/logo.png" alt="FLOLIA" width={200} height={80} className="h-16 md:h-20 lg:h-24 w-auto cursor-pointer" priority />
        </Link>
        {store && (
          <div className="hidden md:flex items-center flex-shrink-0">
            <span className="text-lg font-light tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-500 border-l-2 border-violet-400 pl-3">
              {store.name.replace(/^FLOLIA\s*/i, '')}
            </span>
          </div>
        )}
        <div className="hidden md:flex items-center gap-5 lg:gap-7 text-sm lg:text-base tracking-wide text-gray-500 flex-1 font-zen whitespace-nowrap">
          <a href="#price" className="hover:text-violet-600 transition-colors">{t('nav.price')}</a>
          <a href="#trainer" className="hover:text-violet-600 transition-colors">{t('nav.trainer')}</a>
          <a href="#facility" className="hover:text-violet-600 transition-colors">{t('nav.facility')}</a>
          <a href="#program" className="hover:text-violet-600 transition-colors">{t('nav.program')}</a>
          <a href="#access" className="hover:text-violet-600 transition-colors">{t('nav.access')}</a>
          <a href="#concept" className="hover:text-violet-600 transition-colors">{t('nav.concept')}</a>
        </div>
        <LanguageSwitcher />
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            data-cta="nav_booking_cta"
            onClick={onBookingClick}
            className="group flex items-center gap-2 px-4 md:px-5 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-full hover:shadow-lg hover:shadow-violet-300 transition-all duration-300 font-zen"
          >
            <span className="flex flex-col items-center leading-tight">
              <span className="text-[8px] md:text-[10px] tracking-wider">{t('nav.bookTrialShort')}</span>
              <span className="text-xs md:text-sm font-medium whitespace-nowrap">{t('nav.bookTrial')}</span>
            </span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <a
            href={process.env.NEXT_PUBLIC_LINE_CONTACT_URL || '/contact'}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-2 px-4 md:px-5 py-2 bg-[#06C755] text-white rounded-full hover:bg-[#05B54C] hover:shadow-lg hover:shadow-green-300 transition-all duration-300 font-zen"
            title="LINE問い合わせ"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.193 0-.378-.104-.483-.276l-1.604-2.481v2.122c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.27.174-.51.432-.596.064-.023.133-.034.199-.034.195 0 .378.104.486.274l1.604 2.481V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-5.741 0c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.63H4.917c-.345 0-.63-.285-.63-.63V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            <span className="flex flex-col items-center leading-tight">
              <span className="text-[10px] tracking-wider">LINE</span>
              <span className="text-sm font-medium whitespace-nowrap">お問合せ</span>
            </span>
          </a>
        </div>
      </div>
    </nav>
  )
}

// ============================================
// Hero Section
// ============================================
const HeroSection = ({ onBookingClick, storeSlug, mediaUrls }) => {
  const { t } = useI18n()
  const [isVisible, setIsVisible] = useState(false)
  // 店舗ごとのローカル動画を使用（例: hero-tsujido.mp4）
  // 店舗別ファイルが存在しない場合はデフォルトのhero.mp4にフォールバック
  const videoPath = storeSlug ? `/videos/hero-${storeSlug}.mp4` : '/videos/hero.mp4'

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {videoPath && (
        <video
          key={videoPath}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoPath} type="video/mp4" />
        </video>
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-violet-50/80 via-purple-50/70 to-fuchsia-50/80" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-r from-violet-200/40 via-purple-200/30 to-fuchsia-200/40 rounded-full blur-3xl" />

      <LightParticles />
      <FlowerPetals />

      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div
          className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '200ms' }}
        >
          <p className="text-violet-600 text-sm tracking-[0.3em] mb-6 font-medium font-zen">{t('hero.subtitle')}</p>
        </div>

        <h1
          className={`text-4xl md:text-6xl lg:text-7xl font-shippori font-semibold text-violet-900 mb-8 leading-tight transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '400ms' }}
        >
          {t('hero.line1')}
          <br />
          <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
            {t('hero.line2')}
          </span>
        </h1>

        <p
          className={`text-lg md:text-xl text-violet-700/80 mb-12 leading-relaxed transition-all duration-1000 font-zen ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '600ms' }}
        >
          {t('hero.desc1')}
          <br className="hidden md:block" />
          {t('hero.desc2')}
        </p>

        <div
          className={`flex flex-col items-center gap-4 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '800ms' }}
        >
          {/* 1行目: 無料体験を予約する + LINE問い合わせ */}
          <div className="flex flex-row flex-wrap justify-center gap-3">
            <button
              data-cta="hero_booking_cta"
              onClick={onBookingClick}
              className="group px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-full text-lg hover:shadow-xl hover:shadow-violet-300/50 transition-all duration-300 hover:-translate-y-1"
            >
              <span className="flex items-center justify-center gap-2">
                {t('hero.cta')}
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </button>
            <a
              href={process.env.NEXT_PUBLIC_LINE_CONTACT_URL || '/contact'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-4 bg-[#06C755] text-white rounded-full text-lg hover:bg-[#05B54C] shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.193 0-.378-.104-.483-.276l-1.604-2.481v2.122c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.27.174-.51.432-.596.064-.023.133-.034.199-.034.195 0 .378.104.486.274l1.604 2.481V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-5.741 0c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.63H4.917c-.345 0-.63-.285-.63-.63V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
              </svg>
              {t('hero.lineContact')}
            </a>
          </div>
          {/* 2行目: お問い合わせ + もっと詳しく */}
          <div className="flex flex-row flex-wrap justify-center gap-3">
            <Link href="/contact" className="px-6 py-3 bg-rose-500 text-white rounded-full text-base hover:bg-rose-600 shadow-md hover:shadow-lg transition-all duration-300">
              {t('hero.contact')}
            </Link>
            <a href="#concept" className="px-6 py-3 border-2 border-violet-300 text-violet-700 rounded-full text-base hover:bg-violet-100 transition-all duration-300">
              {t('hero.learnMore')}
            </a>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-violet-400">
        <span className="text-xs tracking-widest">{t('hero.scroll')}</span>
        <div className="w-px h-12 bg-gradient-to-b from-violet-400 to-transparent animate-pulse" />
      </div>
    </section>
  )
}

// ============================================
// Concept Section
// ============================================
const ConceptSection = ({ storeSlug, mediaUrls }) => {
  const { t, locale } = useI18n()
  // ローカル動画をデフォルトに（高速配信）
  const videoPath = mediaUrls.concept?.url || '/videos/concept.mp4'

  // 翻訳データからvaluesを取得
  const values = translations[locale]?.concept?.values || translations.ja.concept.values

  return (
    <section id="concept" className="relative overflow-hidden">
      <div className="relative py-32 md:py-40">
        <video
          key={videoPath}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={videoPath} type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/60 via-purple-600/55 to-fuchsia-600/60" />

        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-fuchsia-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-3xl" />
        </div>

        <BloomingFlowers />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <p className="text-white/80 text-sm md:text-base tracking-[0.4em] mb-8 font-medium font-zen">{t('concept.label')}</p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-shippori font-semibold text-white mb-10 leading-tight">
            {t('concept.title')}
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-white/60 to-transparent mx-auto mb-10" />
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-zen">
            {t('concept.desc1')}
            <br />
            {t('concept.desc2')}
          </p>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mt-6 leading-relaxed font-zen">
            {t('concept.desc3')}
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-6 mt-20">
          <div className="grid md:grid-cols-3 gap-8">
            {values.map((item, i) => (
              <div
                key={i}
                className="group p-8 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-500 hover:-translate-y-2"
              >
                <h3 className="text-xl font-shippori font-semibold text-white mb-1">{item.title}</h3>
                <p className="text-sm text-white/60 mb-4 tracking-wide">{item.subtitle}</p>
                <p className="text-white/80 text-sm leading-relaxed font-zen">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// Gallery Slideshow Section
// ============================================
const GallerySlideshowSection = ({ galleryImages = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)

  // 自動スライド
  useEffect(() => {
    if (!isAutoPlay || galleryImages.length === 0) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % galleryImages.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [isAutoPlay, galleryImages.length])

  if (galleryImages.length === 0) {
    return null
  }

  const goToPrev = () => {
    setIsAutoPlay(false)
    setCurrentSlide((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }

  const goToNext = () => {
    setIsAutoPlay(false)
    setCurrentSlide((prev) => (prev + 1) % galleryImages.length)
  }

  return (
    <section id="gallery" className="py-24 bg-gradient-to-b from-violet-50 via-violet-50/50 to-white relative overflow-hidden">
      {/* 装飾 */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-violet-100/50 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-fuchsia-100/50 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* ヘッダー */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-violet-400" />
            <p className="text-violet-600 text-sm tracking-[0.3em] font-zen font-medium">GALLERY</p>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-violet-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-shippori font-semibold text-violet-900 mb-4">
            スタジオの雰囲気
          </h2>
          <p className="text-violet-600/70 max-w-xl mx-auto font-zen">
            清潔で開放的な空間で、楽しくトレーニング
          </p>
        </div>

        {/* スライドショー */}
        <div className="relative max-w-5xl mx-auto">
          {/* メイン画像 */}
          <div className="relative aspect-[16/9] rounded-3xl overflow-hidden shadow-2xl shadow-violet-200/50 bg-violet-100">
            {galleryImages.map((img, index) => (
              <div
                key={img.path}
                className={`absolute inset-0 transition-all duration-700 ${
                  index === currentSlide
                    ? 'opacity-100 scale-100'
                    : 'opacity-0 scale-105'
                }`}
              >
                <Image
                  src={img.url}
                  alt={`ギャラリー ${index + 1}`}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            ))}

            {/* オーバーレイグラデーション */}
            <div className="absolute inset-0 bg-gradient-to-t from-violet-900/10 via-transparent to-transparent" />

            {/* ナビゲーションボタン */}
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-violet-600 hover:bg-white hover:scale-110 transition-all"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-violet-600 hover:bg-white hover:scale-110 transition-all"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* カウンター */}
            <div className="absolute bottom-4 right-4 px-4 py-2 bg-black/50 backdrop-blur-sm rounded-full text-white text-sm">
              {currentSlide + 1} / {galleryImages.length}
            </div>
          </div>

          {/* サムネイル */}
          {galleryImages.length > 1 && (
            <div className="flex justify-center gap-2 mt-6 flex-wrap">
              {galleryImages.map((img, index) => (
                <button
                  key={img.path}
                  onClick={() => {
                    setIsAutoPlay(false)
                    setCurrentSlide(index)
                  }}
                  className={`relative w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden transition-all ${
                    index === currentSlide
                      ? 'ring-2 ring-violet-500 ring-offset-2 scale-105'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={`サムネイル ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* インジケーター（モバイル用） */}
          <div className="flex justify-center gap-2 mt-6 md:hidden">
            {galleryImages.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setIsAutoPlay(false)
                  setCurrentSlide(index)
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-6 bg-gradient-to-r from-violet-500 to-fuchsia-500'
                    : 'bg-violet-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// Instagram Section
// ============================================
const InstagramSection = ({ instagramUrl, onBookingClick }) => {
  // InstagramのユーザーネームをURLから抽出
  const getInstagramUsername = (url) => {
    if (!url) return null
    const match = url.match(/instagram\.com\/([^/?]+)/)
    return match ? match[1] : null
  }

  const username = getInstagramUsername(instagramUrl)

  return (
    <section id="instagram" className="py-32 bg-gradient-to-b from-violet-900 to-purple-900 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-40 h-40 border border-white rounded-full" />
        <div className="absolute bottom-40 right-40 w-60 h-60 border border-white rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-20 h-20 border border-white rounded-full" />
      </div>

      {/* Instagram */}
      <div className="relative">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-violet-300 text-sm tracking-[0.3em] mb-4">INSTAGRAM</p>
            <h2 className="text-3xl md:text-5xl font-serif text-white mb-6">
              日々の様子をチェック
            </h2>
            <p className="text-violet-200/70 max-w-2xl mx-auto">
              スタジオの雰囲気やレッスン風景、会員様の様子をInstagramで発信しています
            </p>
          </div>

        {username ? (
          <div className="max-w-4xl mx-auto">
            {/* Instagram Embed */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/20">
              <div className="flex items-center justify-center gap-3 mb-6">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="text-white font-medium text-lg">@{username}</span>
              </div>

              {/* Instagram埋め込み用のiframe */}
              <div className="aspect-square md:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black/20">
                <iframe
                  src={`https://www.instagram.com/${username}/embed`}
                  className="w-full h-full border-0"
                  allowTransparency="true"
                  scrolling="no"
                  loading="lazy"
                />
              </div>

              {/* Instagramへのリンクボタン */}
              <div className="mt-6 text-center">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white rounded-full font-medium hover:opacity-90 transition-opacity"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Instagramをフォロー
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-12 border border-white/20 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <p className="text-violet-200 mb-2">Instagramアカウントが設定されていません</p>
              <p className="text-violet-400 text-sm">店舗管理でInstagram URLを設定してください</p>
            </div>
          </div>
        )}
        </div>
      </div>
    </section>
  )
}

// ============================================
// Facility Section
// ============================================
const FacilitySection = ({ storeId }) => {
  const { t } = useI18n()
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const fetchFacilities = async () => {
      try {
        const url = storeId
          ? `/api/public/facilities?store_id=${storeId}`
          : '/api/public/facilities'
        const res = await fetch(url)
        const data = await res.json()
        if (res.ok) {
          setFacilities(data.facilities || [])
        }
      } catch (err) {
        console.error('Failed to fetch facilities:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchFacilities()
  }, [storeId])

  if (loading) {
    return (
      <section id="facility" className="py-32 bg-gradient-to-b from-stone-100 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 w-24 bg-stone-300 rounded mx-auto mb-4"></div>
              <div className="h-10 w-48 bg-stone-300 rounded mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (facilities.length === 0) {
    return null
  }

  const selectedFacility = facilities[selectedIndex]

  return (
    <section id="facility" className="py-32 bg-gradient-to-b from-stone-100 to-white relative overflow-hidden">
      {/* 装飾的な背景要素 */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-violet-50/50 to-transparent" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-gradient-to-tr from-amber-50/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <p className="text-violet-500 text-sm tracking-[0.3em] mb-4 font-zen">{t('facility.label')}</p>
          <h2 className="text-3xl md:text-5xl font-serif text-gray-900 mb-6">
            {t('facility.title')}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {t('facility.desc')}
          </p>
        </div>

        {/* メイン画像エリア */}
        <div className="relative group mb-6">
          <div className="relative aspect-[16/9] md:aspect-[21/9] rounded-2xl overflow-hidden shadow-2xl shadow-stone-300/50">
            {selectedFacility?.image_url ? (
              <Image
                src={selectedFacility.image_url}
                alt={selectedFacility.name}
                fill
                sizes="(max-width: 768px) 100vw, 80vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-200 to-stone-100">
                <svg className="w-24 h-24 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            )}
          </div>

          {/* 左右ナビゲーション */}
          {facilities.length > 1 && (
            <>
              <button
                onClick={() => setSelectedIndex(prev => prev > 0 ? prev - 1 : facilities.length - 1)}
                className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-white hover:text-violet-600 transition-all"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setSelectedIndex(prev => prev < facilities.length - 1 ? prev + 1 : 0)}
                className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-white hover:text-violet-600 transition-all"
              >
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* 設備情報カード */}
        <div className="bg-white rounded-xl p-4 shadow-md shadow-stone-200/50 mb-4">
          <div className="text-center">
            <h3 className="text-base font-medium text-gray-900">
              {selectedFacility?.name}
            </h3>
            <span className="text-xs text-gray-400 mt-1 inline-block">
              {selectedIndex + 1} / {facilities.length}
            </span>
          </div>
          {selectedFacility?.description && (
            <p className="text-gray-500 text-sm leading-relaxed mt-2 text-center">
              {selectedFacility.description}
            </p>
          )}
        </div>

        {/* サムネイル - 横スクロール */}
        {facilities.length > 1 && (
          <div className="flex justify-center gap-3 overflow-x-auto py-3 px-3 scrollbar-hide">
            {facilities.map((facility, index) => (
              <button
                key={facility.id}
                onClick={() => setSelectedIndex(index)}
                className={`relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden transition-all duration-300 ${
                  index === selectedIndex
                    ? 'ring-2 ring-violet-500 ring-offset-2 shadow-lg scale-105'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                {facility.image_url ? (
                  <Image
                    src={facility.image_url}
                    alt={facility.name}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-200 to-stone-100">
                    <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================
// Program Section
// ============================================
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
const LEVEL_LABELS = {
  beginner: {
    label: '初級',
    color: 'bg-green-100 text-green-700',
    cardBg: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
    cardBgMobile: 'bg-green-50 border-green-200'
  },
  intermediate: {
    label: '中級',
    color: 'bg-yellow-100 text-yellow-700',
    cardBg: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200',
    cardBgMobile: 'bg-yellow-50 border-yellow-200'
  },
  advanced: {
    label: '上級',
    color: 'bg-red-100 text-red-700',
    cardBg: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
    cardBgMobile: 'bg-red-50 border-red-200'
  },
  all: {
    label: '全レベル',
    color: 'bg-blue-100 text-blue-700',
    cardBg: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    cardBgMobile: 'bg-blue-50 border-blue-200'
  },
}

// 時間軸を生成（6:00〜23:00）
const generateTimeSlots = (schedules) => {
  if (schedules.length === 0) return []

  // スケジュールから最小・最大時間を取得
  let minHour = 24
  let maxHour = 0
  schedules.forEach(s => {
    const startHour = parseInt(s.start_time?.split(':')[0] || '0')
    const endHour = parseInt(s.end_time?.split(':')[0] || '0')
    if (startHour < minHour) minHour = startHour
    if (endHour > maxHour) maxHour = endHour
  })

  // 前後1時間の余裕を持たせる
  minHour = Math.max(6, minHour - 1)
  maxHour = Math.min(23, maxHour + 1)

  const slots = []
  for (let h = minHour; h <= maxHour; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`)
  }
  return slots
}

const ProgramSection = ({ storeId, storeSlug, galleryImages = [] }) => {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  // スマホ用：初期表示で今日の曜日を選択
  const [selectedDay, setSelectedDay] = useState(() => new Date().getDay())
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)

  // スライドショー画像 - Supabase Storageのギャラリー画像を使用
  const SLIDESHOW_IMAGES = galleryImages.map(img => img.url)

  useEffect(() => {
    if (SLIDESHOW_IMAGES.length === 0) return
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDESHOW_IMAGES.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [SLIDESHOW_IMAGES.length])

  const openScheduleDetail = (schedule) => {
    setSelectedSchedule(schedule)
    setIsDetailModalOpen(true)
  }

  const closeScheduleDetail = () => {
    setIsDetailModalOpen(false)
    setSelectedSchedule(null)
  }

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const url = storeId
          ? `/api/public/schedules?store_id=${storeId}`
          : '/api/public/schedules'
        const res = await fetch(url)
        const data = await res.json()
        if (res.ok) {
          setSchedules(data.schedules || [])
        }
      } catch (err) {
        console.error('Failed to fetch schedules:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSchedules()
  }, [storeId])

  const schedulesByDay = WEEKDAYS.map((_, index) => {
    return schedules.filter(s => s.day_of_week === index)
  })

  return (
    <section id="program" className="py-32 relative overflow-hidden">
      {/* Background - ラベンダーミスト */}
      <div className="absolute inset-0">
        {/* 柔らかいラベンダーのグラデーションベース */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100 via-purple-50 to-fuchsia-100" />

        {/* 霧のレイヤー */}
        <div className="absolute inset-0">
          {/* 上部の霧 */}
          <div
            className="absolute top-0 left-0 w-full h-1/2 opacity-70"
            style={{
              background: `
                radial-gradient(ellipse 100% 80% at 30% 0%, rgba(196, 181, 253, 0.5) 0%, transparent 60%),
                radial-gradient(ellipse 80% 60% at 70% 20%, rgba(232, 121, 249, 0.25) 0%, transparent 50%)
              `
            }}
          />

          {/* 中央の霧 */}
          <div
            className="absolute top-1/4 left-0 w-full h-1/2 opacity-60"
            style={{
              background: `
                radial-gradient(ellipse 90% 50% at 20% 50%, rgba(167, 139, 250, 0.35) 0%, transparent 55%),
                radial-gradient(ellipse 70% 60% at 80% 40%, rgba(221, 214, 254, 0.4) 0%, transparent 50%)
              `
            }}
          />

          {/* 下部の霧 */}
          <div
            className="absolute bottom-0 left-0 w-full h-1/2 opacity-65"
            style={{
              background: `
                radial-gradient(ellipse 100% 70% at 50% 100%, rgba(243, 232, 255, 0.6) 0%, transparent 50%),
                radial-gradient(ellipse 60% 50% at 10% 80%, rgba(192, 132, 252, 0.3) 0%, transparent 50%)
              `
            }}
          />
        </div>

        {/* 柔らかい光のスポット */}
        <div className="absolute top-10 left-[10%] w-96 h-96 bg-violet-300/30 rounded-full blur-[150px]" />
        <div className="absolute top-1/4 right-[5%] w-80 h-80 bg-purple-200/35 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-fuchsia-200/25 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-violet-200/30 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-[180px]" />

        {/* 浮遊する花びらのような装飾 */}
        <div className="absolute top-20 left-[15%] w-3 h-3 bg-violet-300/50 rounded-full blur-[2px]" />
        <div className="absolute top-32 left-[40%] w-2 h-2 bg-purple-300/40 rounded-full blur-[1px]" />
        <div className="absolute top-16 right-[20%] w-2.5 h-2.5 bg-fuchsia-300/45 rounded-full blur-[2px]" />
        <div className="absolute top-48 right-[35%] w-2 h-2 bg-violet-400/35 rounded-full blur-[1px]" />
        <div className="absolute bottom-40 left-[25%] w-3 h-3 bg-purple-300/40 rounded-full blur-[2px]" />
        <div className="absolute bottom-28 left-[55%] w-2 h-2 bg-violet-300/45 rounded-full blur-[1px]" />
        <div className="absolute bottom-52 right-[15%] w-2.5 h-2.5 bg-fuchsia-300/40 rounded-full blur-[2px]" />
        <div className="absolute top-1/2 left-[8%] w-2 h-2 bg-purple-400/35 rounded-full blur-[1px]" />
        <div className="absolute top-1/3 right-[10%] w-3 h-3 bg-violet-300/40 rounded-full blur-[2px]" />

        {/* 繊細なライン装飾 */}
        <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 1440 800">
          <defs>
            <linearGradient id="mistLine1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="30%" stopColor="rgba(167, 139, 250, 0.5)" />
              <stop offset="70%" stopColor="rgba(192, 132, 252, 0.5)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id="mistLine2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="rgba(196, 181, 253, 0.4)" />
              <stop offset="60%" stopColor="rgba(221, 214, 254, 0.4)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            d="M0,200 Q400,150 800,220 T1440,180"
            stroke="url(#mistLine1)"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M0,400 Q300,350 700,420 T1440,380"
            stroke="url(#mistLine2)"
            strokeWidth="1"
            fill="none"
          />
          <path
            d="M0,600 Q500,550 900,620 T1440,580"
            stroke="url(#mistLine1)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-violet-600 text-sm tracking-[0.3em] mb-4 font-medium">PROGRAM</p>
          <h2 className="text-3xl md:text-5xl font-serif text-violet-900 mb-6">
            週間スケジュール
          </h2>
          <p className="text-violet-600/70 max-w-2xl mx-auto">
            あなたのライフスタイルに合わせて、好きな時間にトレーニング
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-violet-600">読み込み中...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12 text-violet-600">
            現在スケジュールは登録されていません
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl shadow-violet-200/50 overflow-hidden border border-violet-100">
            {/* Mobile view - スマホファースト設計 */}
            <div className="md:hidden">
              {/* 曜日タブ - 大きくタップしやすく */}
              <div className="grid grid-cols-7 bg-violet-50">
                {WEEKDAYS.map((day, index) => {
                  const isToday = new Date().getDay() === index
                  const hasSchedules = schedules.some(s => s.day_of_week === index)
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDay(index)}
                      className={`py-4 text-center font-bold transition-all relative ${
                        selectedDay === index
                          ? 'bg-violet-600 text-white'
                          : index === 0
                          ? 'text-red-500 bg-white'
                          : index === 6
                          ? 'text-blue-500 bg-white'
                          : 'text-gray-700 bg-white'
                      }`}
                    >
                      <span className="text-base">{day}</span>
                      {isToday && selectedDay !== index && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full" />
                      )}
                      {hasSchedules && selectedDay !== index && (
                        <span className="block w-1.5 h-1.5 bg-violet-300 rounded-full mx-auto mt-1" />
                      )}
                    </button>
                  )
                })}
              </div>

              {/* 選択中の曜日表示 */}
              <div className="bg-violet-600 text-white text-center py-2 text-sm font-medium">
                {WEEKDAYS[selectedDay]}曜日のスケジュール
              </div>

              {/* スケジュール一覧 */}
              <div className="p-3 bg-gray-50 min-h-[200px]">
                {(() => {
                  const daySchedules = schedules
                    .filter(s => s.day_of_week === selectedDay)
                    .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

                  if (daySchedules.length === 0) {
                    return (
                      <div className="text-center py-12">
                        <p className="text-gray-400 text-lg">この日のクラスはありません</p>
                        <p className="text-gray-300 text-sm mt-2">他の曜日を選択してください</p>
                      </div>
                    )
                  }

                  return (
                    <div className="space-y-2">
                      {daySchedules.map((schedule) => (
                        <div
                          key={schedule.id}
                          onClick={() => openScheduleDetail(schedule)}
                          className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden active:bg-gray-50 transition-colors"
                        >
                          {/* 左側の時間バー + 右側のコンテンツ */}
                          <div className="flex">
                            {/* 時間バー */}
                            <div className={`w-20 flex-shrink-0 py-4 px-2 text-center ${
                              schedule.classes?.level === 'beginner' ? 'bg-green-500' :
                              schedule.classes?.level === 'intermediate' ? 'bg-yellow-500' :
                              schedule.classes?.level === 'advanced' ? 'bg-red-500' :
                              'bg-violet-500'
                            }`}>
                              <p className="text-white font-bold text-lg leading-none">
                                {schedule.start_time?.slice(0, 5)}
                              </p>
                              <p className="text-white/80 text-xs mt-1">
                                {schedule.end_time?.slice(0, 5)}
                              </p>
                            </div>

                            {/* コンテンツ */}
                            <div className="flex-1 p-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 text-base leading-tight">
                                    {schedule.classes?.name}
                                  </h4>
                                  {schedule.instructor_name && (
                                    <p className="text-sm text-gray-500 mt-1">
                                      {schedule.instructor_name}
                                    </p>
                                  )}
                                </div>
                                <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded ${LEVEL_LABELS[schedule.classes?.level]?.color}`}>
                                  {LEVEL_LABELS[schedule.classes?.level]?.label}
                                </span>
                              </div>
                              {schedule.instructor_comment && (
                                <p className="mt-2 text-xs text-gray-400 line-clamp-1">
                                  💬 {schedule.instructor_comment}
                                </p>
                              )}
                            </div>

                            {/* 矢印 */}
                            <div className="flex items-center pr-3 text-gray-300">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Desktop view - 時間軸付きグリッド */}
            {(() => {
              const timeSlots = generateTimeSlots(schedules)

              // スケジュールを時間でソート
              const sortedSchedulesByDay = WEEKDAYS.map((_, index) => {
                return schedules
                  .filter(s => s.day_of_week === index)
                  .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
              })

              // 各時間スロットにどのスケジュールが該当するか
              const getScheduleForTimeSlot = (dayIndex, timeSlot) => {
                const hour = parseInt(timeSlot.split(':')[0])
                return sortedSchedulesByDay[dayIndex].find(s => {
                  const startHour = parseInt(s.start_time?.split(':')[0] || '0')
                  return startHour === hour
                })
              }

              // スケジュールが開始する時間かどうか
              const isScheduleStart = (dayIndex, timeSlot) => {
                const hour = parseInt(timeSlot.split(':')[0])
                return sortedSchedulesByDay[dayIndex].some(s => {
                  const startHour = parseInt(s.start_time?.split(':')[0] || '0')
                  return startHour === hour
                })
              }

              // スケジュールの継続中かどうか（開始時間ではないが範囲内）
              const isScheduleContinuing = (dayIndex, timeSlot) => {
                const hour = parseInt(timeSlot.split(':')[0])
                return sortedSchedulesByDay[dayIndex].some(s => {
                  const startHour = parseInt(s.start_time?.split(':')[0] || '0')
                  const endHour = parseInt(s.end_time?.split(':')[0] || '0')
                  return hour > startHour && hour < endHour
                })
              }

              // スケジュールの高さ（時間枠数）を計算
              const getScheduleSpan = (schedule) => {
                if (!schedule) return 1
                const startHour = parseInt(schedule.start_time?.split(':')[0] || '0')
                const endHour = parseInt(schedule.end_time?.split(':')[0] || '0')
                return Math.max(1, endHour - startHour)
              }

              return (
                <div className="hidden md:block overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* ヘッダー行 */}
                    <div className="grid grid-cols-8 border-b border-violet-200">
                      <div className="p-3 bg-gray-100 text-center text-sm font-medium text-gray-500 border-r border-violet-200">
                        時間
                      </div>
                      {WEEKDAYS.map((day, dayIndex) => (
                        <div
                          key={dayIndex}
                          className={`p-3 text-center font-medium border-r border-violet-200 last:border-r-0 ${
                            dayIndex === 0 ? 'text-red-500 bg-red-50' :
                            dayIndex === 6 ? 'text-blue-500 bg-blue-50' :
                            'text-gray-700 bg-gray-50'
                          }`}
                        >
                          {day}曜日
                        </div>
                      ))}
                    </div>

                    {/* 時間軸とスケジュールグリッド */}
                    {timeSlots.map((timeSlot, timeIndex) => (
                      <div key={timeSlot} className="grid grid-cols-8 border-b border-violet-100 last:border-b-0">
                        {/* 時間列 */}
                        <div className="p-2 bg-gray-50 text-center text-sm text-gray-500 border-r border-violet-200 flex items-center justify-center min-h-[60px]">
                          {timeSlot}
                        </div>

                        {/* 各曜日のセル */}
                        {WEEKDAYS.map((_, dayIndex) => {
                          const schedule = getScheduleForTimeSlot(dayIndex, timeSlot)
                          const isStart = isScheduleStart(dayIndex, timeSlot)
                          const isContinuing = isScheduleContinuing(dayIndex, timeSlot)

                          // 継続中のセルは非表示（rowspanの代わり）
                          if (isContinuing) {
                            return (
                              <div
                                key={dayIndex}
                                className="border-r border-violet-100 last:border-r-0 min-h-[60px]"
                              />
                            )
                          }

                          return (
                            <div
                              key={dayIndex}
                              className="p-1.5 border-r border-violet-100 last:border-r-0 min-h-[60px]"
                            >
                              {isStart && schedule && (
                                <div
                                  onClick={() => openScheduleDetail(schedule)}
                                  className={`p-2 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200 h-full ${LEVEL_LABELS[schedule.classes?.level]?.cardBg || 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100'}`}
                                  style={{ minHeight: `${getScheduleSpan(schedule) * 60 - 12}px` }}
                                >
                                  <h4 className="font-medium text-violet-900 text-xs leading-tight">{schedule.classes?.name}</h4>
                                  <p className="text-xs text-violet-600 mt-0.5">
                                    {schedule.start_time?.slice(0, 5)} - {schedule.end_time?.slice(0, 5)}
                                  </p>
                                  <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] rounded-full ${LEVEL_LABELS[schedule.classes?.level]?.color}`}>
                                    {LEVEL_LABELS[schedule.classes?.level]?.label}
                                  </span>
                                  {schedule.instructor_name && (
                                    <p className="text-[10px] text-violet-400 mt-0.5">{schedule.instructor_name}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        <ScheduleDetailModal
          schedule={selectedSchedule}
          isOpen={isDetailModalOpen}
          onClose={closeScheduleDetail}
        />
      </div>
    </section>
  )
}

// ============================================
// Access Section
// ============================================
const AccessSection = ({ store, storeId }) => {
  const { t } = useI18n()
  const [localStore, setLocalStore] = useState(store)
  const [loading, setLoading] = useState(!store)

  useEffect(() => {
    if (store) {
      setLocalStore(store)
      setLoading(false)
      return
    }

    const fetchStore = async () => {
      try {
        const url = storeId
          ? `/api/public/store?store_id=${storeId}`
          : '/api/public/store'
        const res = await fetch(url)
        const data = await res.json()
        if (res.ok) {
          setLocalStore(data.store)
        }
      } catch (err) {
        console.error('Failed to fetch store:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStore()
  }, [store, storeId])

  return (
    <section id="access" className="py-32 bg-gradient-to-b from-violet-50 to-white relative overflow-hidden">
      <div className="absolute top-20 right-10 w-64 h-64 bg-violet-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-48 h-48 bg-purple-200/30 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="text-center mb-16">
          <p className="text-violet-500 text-sm tracking-[0.3em] mb-4 font-zen">{t('access.label')}</p>
          <h2 className="text-3xl md:text-5xl font-shippori font-semibold text-violet-900 mb-6">
            {t('access.title')}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-violet-400">読み込み中...</div>
        ) : !localStore ? (
          <div className="text-center py-12 text-violet-400">
            店舗情報が登録されていません
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="bg-white rounded-3xl shadow-xl shadow-violet-100/50 p-8 border border-violet-100">
              <h3 className="text-2xl font-shippori font-semibold text-violet-900 mb-6">
                {localStore.name}
              </h3>

              <div className="space-y-5">
                {localStore.address && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-violet-500 font-zen mb-1">{t('access.address')}</p>
                      <p className="text-gray-800 font-zen">
                        {localStore.postal_code && `〒${localStore.postal_code}`}
                        <br />
                        {localStore.address}
                      </p>
                    </div>
                  </div>
                )}

                {localStore.nearest_station && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-violet-500 font-zen mb-1">{t('access.station')}</p>
                      <p className="text-gray-800 font-zen">{localStore.nearest_station}</p>
                    </div>
                  </div>
                )}

                {localStore.access_info && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-violet-500 font-zen mb-1">{t('access.directions')}</p>
                      <p className="text-gray-800 font-zen whitespace-pre-line">{localStore.access_info}</p>
                    </div>
                  </div>
                )}

                {localStore.phone && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-violet-500 font-zen mb-1">{t('access.phone')}</p>
                      <a href={`tel:${localStore.phone}`} className="text-gray-800 font-zen hover:text-violet-600 transition-colors">
                        {localStore.phone}
                      </a>
                    </div>
                  </div>
                )}

                {localStore.business_hours && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-violet-500 font-zen mb-1">{t('access.hours')}</p>
                      <p className="text-gray-800 font-zen whitespace-pre-line">{localStore.business_hours}</p>
                    </div>
                  </div>
                )}

                {localStore.closed_days && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-violet-500 font-zen mb-1">{t('access.closed')}</p>
                      <p className="text-gray-800 font-zen">{localStore.closed_days}</p>
                    </div>
                  </div>
                )}

                {localStore.google_map_url && (
                  <div className="pt-4">
                    <a
                      href={localStore.google_map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-full hover:bg-violet-700 transition-colors font-zen"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      Googleマップで見る
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-violet-100/50 overflow-hidden border border-violet-100">
              {localStore.google_map_embed ? (
                <div
                  className="w-full h-[400px] md:h-[500px]"
                  dangerouslySetInnerHTML={{ __html: localStore.google_map_embed }}
                />
              ) : (
                <div className="w-full h-[400px] md:h-[500px] bg-violet-50 flex items-center justify-center">
                  <div className="text-center text-violet-400">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="font-zen">{t('facility.noMap')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================
// Trainer Section
// ============================================
const TrainerSection = ({ storeId }) => {
  const { t } = useI18n()
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const sliderRef = useRef(null)
  const [selectedInstructor, setSelectedInstructor] = useState(null)

  // 1スライドあたりの表示枚数（レスポンシブ）
  const getVisibleCount = () => {
    if (typeof window === 'undefined') return 3
    if (window.innerWidth < 640) return 1
    if (window.innerWidth < 1024) return 2
    return 3
  }
  const [visibleCount, setVisibleCount] = useState(3)

  useEffect(() => {
    const handleResize = () => setVisibleCount(getVisibleCount())
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const url = storeId
          ? `/api/public/instructors?store_id=${storeId}`
          : '/api/public/instructors'
        const res = await fetch(url)
        const data = await res.json()
        if (res.ok) {
          setInstructors(data.instructors || [])
        }
      } catch (err) {
        console.error('Failed to fetch instructors:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchInstructors()
  }, [storeId])

  const maxIndex = Math.max(0, instructors.length - visibleCount)

  // 自動スライド機能
  useEffect(() => {
    if (!isAutoPlay || isPaused || instructors.length <= visibleCount) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIndex) {
          return 0 // 最後まで行ったら最初に戻る
        }
        return prev + 1
      })
    }, 5000) // 5秒ごとにスライド

    return () => clearInterval(interval)
  }, [isAutoPlay, isPaused, instructors.length, visibleCount, maxIndex])

  const goToPrev = () => {
    setCurrentIndex((prev) => {
      if (prev === 0) return maxIndex // 最初なら最後に
      return prev - 1
    })
  }

  const goToNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) return 0 // 最後なら最初に
      return prev + 1
    })
  }

  if (loading) {
    return (
      <section id="trainer" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mx-auto mb-4"></div>
              <div className="h-10 w-64 bg-gray-200 rounded mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (instructors.length === 0) {
    return null
  }

  return (
    <section id="trainer" className="py-32 bg-gray-50 relative overflow-hidden">
      {/* 背景装飾 */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-20 left-10 w-64 h-64 bg-violet-100/50 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-fuchsia-100/50 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* ヘッダー */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-4 mb-8">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-violet-400" />
            <p className="text-violet-500 text-sm tracking-[0.4em] font-zen font-medium uppercase">{t('trainer.label')}</p>
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-violet-400" />
          </div>

          <h2 className="text-4xl md:text-6xl lg:text-7xl font-shippori font-bold text-gray-900 mb-8 leading-tight">
            {t('trainer.title1')}
            <br />
            <span className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">{t('trainer.title2')}</span>
          </h2>

          <p className="text-gray-600 max-w-2xl mx-auto font-zen text-lg leading-relaxed">
            {t('trainer.desc1')}
            <br className="hidden md:block" />
            {t('trainer.desc2')}
          </p>
        </div>

        {/* シンプルなグリッド表示 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          {instructors.map((instructor) => (
            <div
              key={instructor.id}
              className="flex flex-col items-center text-center cursor-pointer group"
              onClick={() => setSelectedInstructor(instructor)}
            >
              {/* 丸い写真 - グラデーションボーダー（性別により色を変更） */}
              <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full mb-4 p-1 group-hover:scale-105 transition-transform duration-300 ${
                instructor.gender === 'male'
                  ? 'bg-gradient-to-br from-blue-300 via-cyan-300 to-sky-300'
                  : 'bg-gradient-to-br from-violet-300 via-fuchsia-300 to-pink-300'
              }`}>
                <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
                  {instructor.image_url ? (
                    <Image
                      src={instructor.image_url}
                      alt={instructor.name}
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
                      <svg className="w-16 h-16 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* 直筆メッセージ画像 */}
              {instructor.handwritten_message_image_url && (
                <div className="mb-3">
                  <Image
                    src={instructor.handwritten_message_image_url}
                    alt={`${instructor.name}からのメッセージ`}
                    width={240}
                    height={60}
                    className="mx-auto object-contain"
                    style={{ maxHeight: '60px' }}
                  />
                </div>
              )}

              {/* 名前 */}
              <p className="font-shippori font-bold text-lg md:text-xl text-gray-900 mb-1 group-hover:text-violet-600 transition-colors">{instructor.name}</p>

              {/* 血液型・出身地 */}
              {(instructor.blood_type || instructor.prefecture) && (
                <p className="text-gray-500 text-xs md:text-sm font-zen mb-1">
                  {[instructor.blood_type, instructor.prefecture].filter(Boolean).join(' / ')}
                </p>
              )}

              {/* 趣味（一覧では省略表示） */}
              {instructor.bio && (
                <p className="text-gray-600 text-xs md:text-sm leading-relaxed font-zen max-w-[200px] line-clamp-2">
                  趣味：{instructor.bio}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* インストラクター詳細モーダル */}
        {selectedInstructor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedInstructor(null)}
            />
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              {/* モーダルヘッダー */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>{t('trainer.label')}</span>
                  <span>/</span>
                  <span className="text-gray-900">{selectedInstructor.name}</span>
                </div>
                <button
                  onClick={() => setSelectedInstructor(null)}
                  className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
                >
                  {t('voice.close')}
                </button>
              </div>

              {/* モーダルコンテンツ */}
              <div className="p-6">
                {/* プロフィール写真（性別により色を変更） */}
                <div className="flex justify-center mb-6">
                  <div className={`relative w-40 h-40 rounded-full p-1 ${
                    selectedInstructor.gender === 'male'
                      ? 'bg-gradient-to-br from-blue-300 via-cyan-300 to-sky-300'
                      : 'bg-gradient-to-br from-violet-300 via-fuchsia-300 to-pink-300'
                  }`}>
                    <div className="relative w-full h-full rounded-full overflow-hidden bg-white">
                      {selectedInstructor.image_url ? (
                        <Image
                          src={selectedInstructor.image_url}
                          alt={selectedInstructor.name}
                          fill
                          sizes="160px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-violet-100 to-fuchsia-100 flex items-center justify-center">
                          <svg className="w-20 h-20 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 直筆メッセージ */}
                {selectedInstructor.handwritten_message_image_url && (
                  <div className="flex justify-center mb-6">
                    <Image
                      src={selectedInstructor.handwritten_message_image_url}
                      alt={`${selectedInstructor.name}からのメッセージ`}
                      width={280}
                      height={70}
                      className="object-contain"
                    />
                  </div>
                )}

                {/* 名前 */}
                <h3 className="text-2xl font-shippori font-bold text-center text-gray-900 mb-2">
                  {selectedInstructor.name}
                </h3>

                {/* 血液型・出身地 */}
                {(selectedInstructor.blood_type || selectedInstructor.prefecture) && (
                  <p className="text-center text-gray-500 text-sm font-zen mb-1">
                    {[selectedInstructor.blood_type, selectedInstructor.prefecture].filter(Boolean).join(' / ')}
                  </p>
                )}

                {/* 趣味 */}
                {selectedInstructor.bio && (
                  <p className="text-center text-gray-500 text-sm font-zen mb-6">
                    趣味：{selectedInstructor.bio}
                  </p>
                )}

                {/* コメント */}
                {selectedInstructor.comment && (
                  <div className="bg-pink-50 rounded-2xl p-6">
                    <p className="text-gray-700 leading-relaxed font-zen whitespace-pre-line text-center">
                      {selectedInstructor.comment}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* スライダーは削除（グリッド表示に変更）*/}
        {false && instructors.length > visibleCount && (
          <div className="flex justify-center gap-3 mt-10">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentIndex === i
                    ? 'w-10 bg-gradient-to-r from-violet-400 to-fuchsia-400'
                    : 'w-2 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================
// News Section
// ============================================
const NewsSection = ({ storeId }) => {
  const { t, locale } = useI18n()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const url = storeId
          ? `/api/public/announcements?store_id=${storeId}&limit=5`
          : '/api/public/announcements?limit=5'
        const res = await fetch(url)
        const data = await res.json()
        if (res.ok) {
          setAnnouncements(data.announcements || [])
        }
      } catch (err) {
        console.error('Failed to fetch announcements:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAnnouncements()
  }, [storeId])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!loading && announcements.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-violet-500 text-sm tracking-[0.3em] mb-3 font-zen">{t('news.label')}</p>
          <h2 className="text-2xl md:text-3xl font-shippori font-semibold text-violet-900">
            {t('news.title')}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-8 text-violet-400">読み込み中...</div>
        ) : (
          <div className="bg-violet-50 rounded-2xl p-6 md:p-8">
            <ul className="divide-y divide-violet-200">
              {announcements.map((announcement) => (
                <li key={announcement.id} className="py-4 first:pt-0 last:pb-0">
                  <button
                    onClick={() => setSelectedAnnouncement(announcement)}
                    className="w-full text-left hover:bg-violet-100 -mx-4 px-4 py-2 rounded-lg transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
                      <time className="text-sm text-violet-500 font-zen whitespace-nowrap flex-shrink-0">
                        {formatDate(announcement.published_at)}
                      </time>
                      <div className="flex-1">
                        <h3 className="text-gray-800 font-zen font-medium leading-relaxed">
                          {announcement.title}
                        </h3>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* お知らせ詳細ポップアップ */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <time className="text-sm text-violet-500 font-zen">
                    {formatDate(selectedAnnouncement.published_at)}
                  </time>
                  <h3 className="text-xl font-shippori font-semibold text-gray-900 mt-2">
                    {selectedAnnouncement.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="prose prose-violet max-w-none font-zen text-gray-700 whitespace-pre-wrap leading-relaxed">
                {selectedAnnouncement.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ============================================
// Price Section
// ============================================
// デフォルトの料金データ（APIから取得できない場合のフォールバック）
const defaultPricesJa = [
  {
    category: '体験',
    items: [
      { name: '体験レッスン', price: '無料', note: '初回限定・要予約', isFree: true },
    ]
  },
  {
    category: '月会費',
    items: [
      { name: 'レギュラー会員', price: '¥11,000', note: '月4回まで' },
      { name: 'スタンダード会員', price: '¥16,500', note: '月8回まで' },
      { name: 'プレミアム会員', price: '¥22,000', note: '通い放題' },
    ]
  },
  {
    category: 'ビジター',
    items: [
      { name: 'ドロップイン', price: '¥3,300', note: '1回' },
      { name: '回数券（5回）', price: '¥14,300', note: '有効期限3ヶ月' },
      { name: '回数券（10回）', price: '¥26,400', note: '有効期限6ヶ月' },
    ]
  },
  {
    category: 'オプション',
    items: [
      { name: 'パーソナルトレーニング', price: '¥5,500', note: '30分' },
      { name: 'レンタルグローブ', price: '¥330', note: '1回' },
      { name: 'レンタルウェア', price: '¥330', note: '上下セット' },
    ]
  },
]

const defaultPricesEn = [
  {
    category: 'Trial',
    items: [
      { name: 'Trial Lesson', price: 'Free', note: 'First time only, reservation required', isFree: true },
    ]
  },
  {
    category: 'Monthly',
    items: [
      { name: 'Regular Member', price: '¥11,000', note: 'Up to 4 times/month' },
      { name: 'Standard Member', price: '¥16,500', note: 'Up to 8 times/month' },
      { name: 'Premium Member', price: '¥22,000', note: 'Unlimited' },
    ]
  },
  {
    category: 'Visitor',
    items: [
      { name: 'Drop-in', price: '¥3,300', note: '1 session' },
      { name: '5-Class Pass', price: '¥14,300', note: 'Valid 3 months' },
      { name: '10-Class Pass', price: '¥26,400', note: 'Valid 6 months' },
    ]
  },
  {
    category: 'Options',
    items: [
      { name: 'Personal Training', price: '¥5,500', note: '30 min' },
      { name: 'Glove Rental', price: '¥330', note: 'per session' },
      { name: 'Wear Rental', price: '¥330', note: 'Top & Bottom set' },
    ]
  },
]

const PriceSection = ({ storeId }) => {
  const { t, locale } = useI18n()
  const [pricesJa, setPricesJa] = useState(defaultPricesJa)
  const [pricesEn, setPricesEn] = useState(defaultPricesEn)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const params = new URLSearchParams({ for_lp: 'true' })
        if (storeId) params.append('store_id', storeId)

        const res = await fetch(`/api/public/plans?${params}`)
        const data = await res.json()

        if (res.ok && data.pricesJa && data.pricesJa.length > 0) {
          setPricesJa(data.pricesJa)
          setPricesEn(data.pricesEn || data.pricesJa)
        }
      } catch (error) {
        console.error('Failed to fetch prices:', error)
        // フォールバックとしてデフォルト値を使用
      } finally {
        setLoading(false)
      }
    }
    fetchPrices()
  }, [storeId])

  const prices = locale === 'en' ? pricesEn : pricesJa

  return (
    <section id="price" className="py-32 bg-violet-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-violet-500 text-sm tracking-[0.3em] mb-4 font-zen">{t('price.label')}</p>
          <h2 className="text-3xl md:text-5xl font-shippori font-semibold text-violet-900 mb-6">
            {t('price.title')}
          </h2>
          <p className="text-violet-600/70 max-w-2xl mx-auto font-zen">
            {t('price.desc')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {prices.map((category, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-8 shadow-lg shadow-violet-100/50 border border-violet-100 hover:shadow-xl hover:shadow-violet-200/50 transition-all duration-300"
            >
              <h3 className="text-xl font-shippori font-semibold text-violet-900 mb-6 pb-4 border-b border-violet-100">
                {category.category}
              </h3>
              <div className="space-y-4">
                {category.items.map((item, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-zen text-gray-800 font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500 font-zen">{item.note}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${item.isFree ? 'text-fuchsia-500' : 'text-violet-600'}`}>
                        {item.isFree ? t('price.free') : item.price}
                      </p>
                      {!item.isFree && (
                        <p className="text-xs text-gray-400">{t('price.taxIncluded')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-block bg-violet-100 rounded-2xl px-8 py-6">
            <p className="text-violet-800 font-zen text-sm mb-2">
              {t('price.note1')}
            </p>
            <p className="text-violet-600 font-zen text-sm">
              {t('price.note2')}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// Testimonials Section
// ============================================
const TestimonialsSection = ({ storeId }) => {
  const { t } = useI18n()
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedTestimonial, setSelectedTestimonial] = useState(null)
  const [isAutoPlay, setIsAutoPlay] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const sliderRef = useRef(null)

  // 1スライドあたりの表示枚数（レスポンシブ）
  const getVisibleCount = () => {
    if (typeof window === 'undefined') return 3
    if (window.innerWidth < 640) return 1
    if (window.innerWidth < 1024) return 2
    return 3
  }
  const [visibleCount, setVisibleCount] = useState(3)

  useEffect(() => {
    const handleResize = () => setVisibleCount(getVisibleCount())
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const url = storeId
          ? `/api/public/testimonials?store_id=${storeId}`
          : '/api/public/testimonials'
        const res = await fetch(url)
        const data = await res.json()
        if (res.ok) {
          setTestimonials(data.testimonials || [])
        }
      } catch (err) {
        console.error('Failed to fetch testimonials:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTestimonials()
  }, [storeId])

  const maxIndex = Math.max(0, testimonials.length - visibleCount)

  // 自動スライド機能
  useEffect(() => {
    if (!isAutoPlay || isPaused || selectedTestimonial || testimonials.length <= visibleCount) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= maxIndex) {
          return 0 // 最後まで行ったら最初に戻る
        }
        return prev + 1
      })
    }, 5000) // 5秒ごとにスライド

    return () => clearInterval(interval)
  }, [isAutoPlay, isPaused, selectedTestimonial, testimonials.length, visibleCount, maxIndex])

  const goToPrev = () => {
    setCurrentIndex((prev) => {
      if (prev === 0) return maxIndex // 最初なら最後に
      return prev - 1
    })
  }

  const goToNext = () => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) return 0 // 最後なら最初に
      return prev + 1
    })
  }

  if (loading) {
    return (
      <section id="testimonials" className="py-32 bg-gradient-to-b from-violet-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded mx-auto mb-4"></div>
              <div className="h-10 w-48 bg-gray-200 rounded mx-auto"></div>
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (testimonials.length === 0) {
    return null
  }

  return (
    <section id="testimonials" className="py-32 relative overflow-hidden">
      {/* 背景動画 */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/cta.mp4" type="video/mp4" />
      </video>

      {/* ダーク系オーバーレイ */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 via-purple-900/60 to-fuchsia-900/60" />

      {/* 追加のグラデーションオーバーレイ */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.3),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(236,72,153,0.2),transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* ヘッダー */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-4 mb-6">
            <div className="w-16 h-px bg-gradient-to-r from-transparent to-violet-400" />
            <p className="text-violet-300 text-sm tracking-[0.4em] font-zen font-medium uppercase">{t('voice.label')}</p>
            <div className="w-16 h-px bg-gradient-to-l from-transparent to-violet-400" />
          </div>

          <h2 className="text-3xl md:text-5xl font-shippori font-bold text-white mb-6">
            {t('voice.title')}
          </h2>

          <p className="text-violet-200/80 max-w-2xl mx-auto font-zen text-lg leading-relaxed">
            {t('voice.desc1')}
            <br className="hidden md:block" />
            {t('voice.desc2')}
          </p>
        </div>

        {/* ナビゲーションボタン */}
        <div className="flex justify-center mb-8">
          {testimonials.length > visibleCount && (
            <div className="flex items-center gap-3">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                  currentIndex === 0
                    ? 'border-white/30 text-white/30 cursor-not-allowed'
                    : 'border-white/50 text-white hover:border-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToNext}
                disabled={currentIndex >= maxIndex}
                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                  currentIndex >= maxIndex
                    ? 'border-white/30 text-white/30 cursor-not-allowed'
                    : 'border-white/50 text-white hover:border-white hover:bg-white/10'
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* カードスライダー */}
        <div
          className="relative overflow-hidden"
          ref={sliderRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * (100 / visibleCount)}%)` }}
          >
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="flex-shrink-0 px-3"
                style={{ width: `${100 / visibleCount}%` }}
              >
                <div className="bg-white rounded-3xl shadow-lg shadow-violet-100/50 overflow-hidden border border-violet-100 h-full flex flex-col">
                  {/* 画像エリア */}
                  <div className="relative aspect-[4/5] bg-gradient-to-b from-violet-100 to-violet-50">
                    {testimonial.customer_image_url ? (
                      <Image
                        src={testimonial.customer_image_url}
                        alt={testimonial.customer_name}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-24 h-24 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    {/* カテゴリバッジ */}
                    <div className="absolute bottom-4 left-4">
                      <span className="inline-block px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-full">
                        {t('voice.badge')}
                      </span>
                    </div>
                  </div>

                  {/* テキストエリア */}
                  <div className="p-6 flex-1 flex flex-col">
                    {/* お客様情報 */}
                    <div className="mb-3">
                      <p className="font-semibold text-gray-900">{testimonial.customer_name}</p>
                      <div className="flex flex-wrap items-center gap-1 text-xs text-gray-500 mt-1">
                        {testimonial.customer_age && <span>{testimonial.customer_age}</span>}
                        {testimonial.customer_occupation && (
                          <>
                            {testimonial.customer_age && <span>・</span>}
                            <span>{testimonial.customer_occupation}</span>
                          </>
                        )}
                        {testimonial.membership_duration && (
                          <>
                            <span>・</span>
                            <span>{t('voice.memberSince')}{testimonial.membership_duration}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* 感想プレビュー */}
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 flex-1">
                      {testimonial.impression || testimonial.trigger_reason || testimonial.message_to_prospects}
                    </p>

                    {/* 詳細ボタン */}
                    <button
                      onClick={() => setSelectedTestimonial(testimonial)}
                      className="mt-4 flex items-center gap-2 text-violet-600 font-medium text-sm hover:text-violet-700 transition-colors group"
                    >
                      <span>{t('voice.view')}</span>
                      <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center group-hover:bg-violet-700 transition-colors">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 詳細モーダル */}
      {selectedTestimonial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedTestimonial(null)}
          />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* モーダルヘッダー */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>{t('voice.category')}</span>
                <span>/</span>
                <span className="text-gray-900">{t('voice.title')}</span>
              </div>
              <button
                onClick={() => setSelectedTestimonial(null)}
                className="px-6 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
              >
                {t('voice.close')}
              </button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="p-6 md:p-8">
              {/* お客様情報 */}
              <div className="flex items-center gap-4 mb-8">
                <div className="relative w-20 h-20 rounded-full bg-violet-100 overflow-hidden flex-shrink-0">
                  {selectedTestimonial.customer_image_url ? (
                    <Image
                      src={selectedTestimonial.customer_image_url}
                      alt={selectedTestimonial.customer_name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-xl text-gray-900">{selectedTestimonial.customer_name}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mt-1">
                    {selectedTestimonial.customer_age && <span>{selectedTestimonial.customer_age}</span>}
                    {selectedTestimonial.customer_gender && (
                      <>
                        {selectedTestimonial.customer_age && <span>・</span>}
                        <span>{selectedTestimonial.customer_gender}</span>
                      </>
                    )}
                    {selectedTestimonial.customer_occupation && (
                      <>
                        <span>・</span>
                        <span>{selectedTestimonial.customer_occupation}</span>
                      </>
                    )}
                    {selectedTestimonial.membership_duration && (
                      <>
                        <span>・</span>
                        <span>会員歴{selectedTestimonial.membership_duration}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ご入会のきっかけ */}
              {selectedTestimonial.trigger_reason && (
                <div className="mb-6">
                  <h4 className="text-violet-600 font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
                    ご入会のきっかけ
                  </h4>
                  <p className="text-gray-600 leading-relaxed pl-4">
                    {selectedTestimonial.trigger_reason}
                  </p>
                </div>
              )}

              {/* ご入会された感想 */}
              {selectedTestimonial.impression && (
                <div className="mb-6">
                  <h4 className="text-violet-600 font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-violet-500 rounded-full"></span>
                    ご入会された感想
                  </h4>
                  <p className="text-gray-600 leading-relaxed pl-4">
                    {selectedTestimonial.impression}
                  </p>
                </div>
              )}

              {/* ご入会をご検討中の方へ */}
              {selectedTestimonial.message_to_prospects && (
                <div className="bg-violet-50 rounded-xl p-6 mt-6">
                  <h4 className="text-violet-700 font-semibold mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    ご入会をご検討中の方へ
                  </h4>
                  <p className="text-violet-800 leading-relaxed italic text-lg">
                    「{selectedTestimonial.message_to_prospects}」
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ============================================
// Footer
// ============================================
const Footer = ({ store, storeSlug }) => {
  const { t } = useI18n()

  return (
    <footer className="py-16 pb-24 md:pb-16 bg-white border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col items-center gap-8">
          <Link href={storeSlug ? `/stores/${storeSlug}` : '/'} className="flex items-center">
            <Image src="/logo.png" alt="FLOLIA" width={200} height={96} className="h-24 w-auto cursor-pointer" />
          </Link>

          {store && (
            <span className="text-xl font-light tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-500">
              {store.name.replace(/^FLOLIA\s*/i, '')}
            </span>
          )}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-gray-500 font-zen">
          <Link href="/terms" className="hover:text-violet-600 transition-colors">{t('footer.terms')}</Link>
          <span className="text-gray-300">|</span>
          <Link href="/privacy" className="hover:text-violet-600 transition-colors">{t('footer.privacy')}</Link>
          <span className="text-gray-300">|</span>
          <Link href="/tokushoho" className="hover:text-violet-600 transition-colors">{t('footer.tokushoho')}</Link>
          <span className="text-gray-300">|</span>
          <Link href="/disclaimer" className="hover:text-violet-600 transition-colors">{t('footer.disclaimer')}</Link>
          <span className="text-gray-300">|</span>
          <Link href="/faq" className="hover:text-violet-600 transition-colors">{t('footer.faq')}</Link>
          <span className="text-gray-300">|</span>
          <a
            href={process.env.NEXT_PUBLIC_LINE_CONTACT_URL || '/contact'}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-violet-600 transition-colors"
          >{t('footer.contact')}</a>
          <span className="text-gray-300">|</span>
          <Link href="/careers" className="hover:text-violet-600 transition-colors">{t('footer.careers')}</Link>
          {storeSlug && (
            <>
              <span className="text-gray-300">|</span>
              <Link href="/" className="hover:text-violet-600 transition-colors">{t('footer.top')}</Link>
            </>
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex justify-center gap-4 mb-6">
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-violet-100 hover:text-violet-600 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-violet-100 hover:text-violet-600 transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/></svg>
            </a>
            <a
              href={process.env.NEXT_PUBLIC_LINE_CONTACT_URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-[#06C755] hover:text-white transition-colors"
              aria-label="LINE問い合わせ"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.193 0-.378-.104-.483-.276l-1.604-2.481v2.122c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.27.174-.51.432-.596.064-.023.133-.034.199-.034.195 0 .378.104.486.274l1.604 2.481V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-5.741 0c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.63H4.917c-.345 0-.63-.285-.63-.63V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            </a>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              {t('footer.copyright')}
            </p>
            <p className="text-gray-400 text-xs mt-2">
              {t('footer.operator')}
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ============================================
// Mobile Floating Buttons (Bottom Fixed)
// ============================================
const MobileFloatingButtons = ({ onBookingClick, storeSlug }) => {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
      <div className="flex items-stretch">
        {/* 体験入会WEB予約 - メインCTA */}
        <button
          onClick={onBookingClick}
          data-cta="mobile_booking_cta"
          className="flex-1 bg-gradient-to-r from-violet-500 to-violet-600 text-white py-3 px-4 active:from-violet-600 active:to-violet-700 transition-all"
        >
          <div className="flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-bold">体験入会WEB予約</span>
          </div>
        </button>

        {/* LINE問い合わせ */}
        <a
          href={process.env.NEXT_PUBLIC_LINE_CONTACT_URL || '/contact'}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-[#06C755] to-[#05B54C] text-white py-3 px-4 active:from-[#05B54C] active:to-[#04A043] transition-all border-l border-white/20"
        >
          <div className="flex items-center justify-center gap-1">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.193 0-.378-.104-.483-.276l-1.604-2.481v2.122c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.27.174-.51.432-.596.064-.023.133-.034.199-.034.195 0 .378.104.486.274l1.604 2.481V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-5.741 0c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.63H4.917c-.345 0-.63-.285-.63-.63V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
            </svg>
            <span className="text-xs font-bold">問合せ</span>
          </div>
        </a>

        {/* ページTOPへ */}
        <button
          onClick={scrollToTop}
          className={`bg-gray-700 text-white py-3 px-3 active:bg-gray-800 transition-all ${
            showScrollTop ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ============================================
// Side Floating Buttons (Right Side - Desktop)
// ============================================
const SideFloatingButtons = ({ onBookingClick, storeSlug }) => {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="fixed right-0 bottom-8 z-40 hidden md:flex flex-col">
      {/* 体験入会WEB予約 */}
      <button
        onClick={onBookingClick}
        data-cta="side_booking_cta"
        className="group relative bg-gradient-to-b from-violet-500 to-violet-600 text-white py-6 px-2 hover:from-violet-600 hover:to-violet-700 transition-all duration-300 shadow-lg hover:shadow-xl rounded-l-lg"
      >
        <div className="flex flex-col items-center gap-1 writing-vertical">
          <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-bold tracking-wider" style={{ writingMode: 'vertical-rl' }}>体験入会WEB予約</span>
        </div>
      </button>

      {/* LINE問い合わせ */}
      <a
        href={process.env.NEXT_PUBLIC_LINE_CONTACT_URL || '/contact'}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative bg-gradient-to-b from-[#06C755] to-[#05B54C] text-white py-6 px-2 hover:from-[#05B54C] hover:to-[#04A043] transition-all duration-300 shadow-lg hover:shadow-xl"
      >
        <div className="flex flex-col items-center gap-1 writing-vertical">
          <svg className="w-5 h-5 mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.193 0-.378-.104-.483-.276l-1.604-2.481v2.122c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.27.174-.51.432-.596.064-.023.133-.034.199-.034.195 0 .378.104.486.274l1.604 2.481V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-5.741 0c0 .345-.282.63-.63.63-.345 0-.627-.285-.627-.63V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.63H4.917c-.345 0-.63-.285-.63-.63V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
          </svg>
          <span className="text-xs font-bold tracking-wider" style={{ writingMode: 'vertical-rl' }}>LINE問合せ</span>
        </div>
      </a>

      {/* ページTOPへ */}
      <button
        onClick={scrollToTop}
        className={`group relative bg-gradient-to-b from-gray-600 to-gray-700 text-white py-6 px-2 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl rounded-bl-lg ${
          showScrollTop ? 'opacity-100' : 'opacity-50'
        }`}
      >
        <div className="flex flex-col items-center gap-1 writing-vertical">
          <svg className="w-5 h-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          <span className="text-xs font-bold tracking-wider" style={{ writingMode: 'vertical-rl' }}>ページTOP</span>
        </div>
      </button>
    </div>
  )
}

// ============================================
// Main Landing Page Component
// ============================================
export default function LandingPage({ store = null, storeSlug = null, isPreview = false }) {
  const [isBookingOpen, setIsBookingOpen] = useState(false)
  const [mediaUrls, setMediaUrls] = useState({})
  const [galleryImages, setGalleryImages] = useState([])

  const openBooking = (event) => {
    const ctaId = event?.currentTarget?.dataset?.cta || 'booking_cta'
    setIsBookingOpen(true)
    import('@/lib/analytics/client').then(({ Analytics }) => {
      Analytics.trackCtaClick(ctaId, storeSlug)
      // アナリティクス: 予約モーダルを開いた
      Analytics.trackBookingModalOpen(storeSlug)
    })
  }
  const closeBooking = () => setIsBookingOpen(false)

  const storeId = store?.id || null

  // Supabase Storageからメディア情報を取得（店舗ごと）
  useEffect(() => {
    const fetchMedia = async () => {
      if (!storeSlug) return

      try {
        // 動画メディア取得
        const res = await fetch(`/api/upload/store-media?store_slug=${storeSlug}`)
        const data = await res.json()
        if (res.ok && data.media) {
          const existingMedia = {}
          Object.entries(data.media).forEach(([key, value]) => {
            if (value.exists) {
              existingMedia[key] = value
            }
          })
          setMediaUrls(existingMedia)
        }

        // ギャラリー画像取得（スライドショー用）
        const galleryRes = await fetch(`/api/upload/gallery?store_slug=${storeSlug}`)
        const galleryData = await galleryRes.json()
        if (galleryRes.ok && galleryData.images) {
          setGalleryImages(galleryData.images)
        }
      } catch (err) {
        console.error('Failed to fetch media:', err)
      }
    }
    fetchMedia()
  }, [storeSlug])

  return (
    <I18nProvider translations={translations}>
      {/* プレビューモードの場合は検索エンジンにインデックスされないようにする */}
      {isPreview && (
        <head>
          <meta name="robots" content="noindex, nofollow" />
        </head>
      )}
      <div className="min-h-screen bg-white">
        {/* プレビューバナー */}
        {isPreview && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-900 text-center py-2 px-4 text-sm font-medium shadow-lg">
            プレビューモード - このページは非公開です。一般ユーザーには表示されません。
          </div>
        )}
        <Navigation onBookingClick={openBooking} store={store} storeSlug={storeSlug} />
        <HeroSection onBookingClick={openBooking} storeSlug={storeSlug} mediaUrls={mediaUrls} />
        <NewsSection storeId={storeId} />
        <PriceSection storeId={storeId} />
        <TrainerSection storeId={storeId} />
        <FacilitySection storeId={storeId} />
        <TestimonialsSection storeId={storeId} storeSlug={storeSlug} />
        <ProgramSection storeId={storeId} storeSlug={storeSlug} galleryImages={galleryImages} />
        <AccessSection store={store} storeId={storeId} />
        <ConceptSection storeSlug={storeSlug} mediaUrls={mediaUrls} />
        <GallerySlideshowSection galleryImages={galleryImages} />
        <InstagramSection instagramUrl={store?.instagram_url} />
        <Footer store={store} storeSlug={storeSlug} />

        {/* 右サイド固定ボタン（デスクトップ） */}
        <SideFloatingButtons onBookingClick={openBooking} storeSlug={storeSlug} />

        {/* 下部固定ボタン（スマホ） */}
        <MobileFloatingButtons onBookingClick={openBooking} storeSlug={storeSlug} />

        <BookingModal
          isOpen={isBookingOpen}
          onClose={closeBooking}
          initialType="trial"
          storeId={storeId}
        />
      </div>
    </I18nProvider>
  )
}
