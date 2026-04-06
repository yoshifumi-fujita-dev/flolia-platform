'use client'

// セッションIDを生成・取得
function getSessionId() {
  if (typeof window === 'undefined') return null

  let sessionId = sessionStorage.getItem('flolia_session_id')
  if (!sessionId) {
    sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
    sessionStorage.setItem('flolia_session_id', sessionId)
  }
  return sessionId
}

// ページビュー送信
export async function trackPageView(storeSlug = null, path = null) {
  if (typeof window === 'undefined') return

  try {
    const sessionId = getSessionId()
    const currentPath = path || window.location.pathname

    await fetch('/api/analytics/page-view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_slug: storeSlug,
        path: currentPath,
        referrer: document.referrer || null,
        session_id: sessionId,
      }),
    })

    // GA4にも送信（設定されている場合）
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: currentPath,
        store_slug: storeSlug,
      })
    }
  } catch (error) {
    console.error('Failed to track page view:', error)
  }
}

// イベント送信
export async function trackEvent(name, meta = {}, storeSlug = null) {
  if (typeof window === 'undefined') return

  try {
    const sessionId = getSessionId()

    await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_slug: storeSlug,
        name,
        meta,
        session_id: sessionId,
      }),
    })

    // GA4にも送信（設定されている場合）
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, {
        ...meta,
        store_slug: storeSlug,
      })
    }
  } catch (error) {
    console.error('Failed to track event:', error)
  }
}

// 予め定義されたイベント
export const Analytics = {
  // CTAクリック
  trackCtaClick: (buttonId, storeSlug = null) => {
    trackEvent('cta_click', { button_id: buttonId }, storeSlug)
  },

  // 予約モーダルを開いた
  trackBookingModalOpen: (storeSlug = null) => {
    trackEvent('booking_modal_open', {}, storeSlug)
  },

  // 予約完了
  trackBookingCreated: (bookingType, storeSlug = null) => {
    trackEvent('booking_created', { booking_type: bookingType }, storeSlug)
  },

  // 会員登録開始
  trackRegisterStarted: (storeSlug = null) => {
    trackEvent('register_started', {}, storeSlug)
  },

  // 登録ステップ
  trackRegisterStep: (step, storeSlug = null) => {
    trackEvent(`register_step${step}`, { step }, storeSlug)
  },

  // 会員登録完了
  trackMemberRegistered: (planId, storeSlug = null) => {
    trackEvent('member_registered', { plan_id: planId }, storeSlug)
  },

  // LINE連携開始
  trackLineLoginStart: (storeSlug = null) => {
    trackEvent('line_login_start', {}, storeSlug)
  },

  // LINE連携成功
  trackLineLoginSuccess: (storeSlug = null) => {
    trackEvent('line_login_success', {}, storeSlug)
  },

  // お問い合わせフォーム送信
  trackContactFormSubmit: (category, storeSlug = null) => {
    trackEvent('contact_form_submit', { category }, storeSlug)
  },
}
