/**
 * LINE LIFF (LINE Front-end Framework) ユーティリティ
 * LINEアプリ内でWebページを表示するための機能を提供
 */

let liffInitialized = false
let liffObject = null
let currentLiffId = null

/**
 * LIFFを初期化
 * @param {string} liffIdOverride - 使用するLIFF ID（未指定時は NEXT_PUBLIC_LIFF_ID）
 * @returns {Promise<object>} - LIFF オブジェクト
 */
export async function initLiff(liffIdOverride) {
  if (typeof window === 'undefined') {
    return null
  }

  // 使用するLIFF IDを決定
  const liffId = liffIdOverride || process.env.NEXT_PUBLIC_LIFF_ID

  if (!liffId) {
    console.warn('LIFF ID is not configured')
    return null
  }

  // 既に同じLIFF IDで初期化済みの場合はそのまま返す
  if (liffInitialized && liffObject && currentLiffId === liffId) {
    return liffObject
  }

  try {
    const liff = (await import('@line/liff')).default
    await liff.init({ liffId })
    liffInitialized = true
    liffObject = liff
    currentLiffId = liffId
    return liff
  } catch (error) {
    console.error('LIFF initialization error:', error)
    return null
  }
}

/**
 * LIFFが初期化済みかどうか
 * @returns {boolean}
 */
export function isLiffInitialized() {
  return liffInitialized
}

/**
 * LINEアプリ内で実行されているか確認
 * @returns {boolean}
 */
export function isInLineApp() {
  if (!liffObject) return false
  return liffObject.isInClient()
}

/**
 * LINEにログイン済みか確認
 * @returns {boolean}
 */
export function isLoggedIn() {
  if (!liffObject) return false
  return liffObject.isLoggedIn()
}

/**
 * LINEログインを実行
 * @param {string} redirectUri - ログイン後のリダイレクト先（省略時は現在のURL）
 */
export function login(redirectUri) {
  if (!liffObject) return
  liffObject.login({ redirectUri: redirectUri || window.location.href })
}

/**
 * LINEからログアウト
 */
export function logout() {
  if (!liffObject) return
  liffObject.logout()
}

/**
 * LINEユーザープロフィールを取得
 * @returns {Promise<object|null>} - { userId, displayName, pictureUrl, statusMessage }
 */
export async function getProfile() {
  if (!liffObject || !liffObject.isLoggedIn()) {
    return null
  }

  try {
    const profile = await liffObject.getProfile()
    return profile
  } catch (error) {
    console.error('Failed to get LINE profile:', error)
    return null
  }
}

/**
 * LINEユーザーIDを取得
 * @returns {Promise<string|null>}
 */
export async function getLineUserId() {
  const profile = await getProfile()
  return profile?.userId || null
}

/**
 * LIFFウィンドウを閉じる
 */
export function closeWindow() {
  if (!liffObject) return
  liffObject.closeWindow()
}

/**
 * LINEでメッセージを送信（SendMessage API）
 * @param {array} messages - 送信するメッセージの配列
 */
export async function sendMessages(messages) {
  if (!liffObject || !liffObject.isInClient()) {
    console.warn('sendMessages is only available in LINE app')
    return false
  }

  try {
    await liffObject.sendMessages(messages)
    return true
  } catch (error) {
    console.error('Failed to send messages:', error)
    return false
  }
}

/**
 * アクセストークンを取得
 * @returns {string|null}
 */
export function getAccessToken() {
  if (!liffObject || !liffObject.isLoggedIn()) {
    return null
  }
  return liffObject.getAccessToken()
}

/**
 * LIFFコンテキストを取得
 * @returns {object|null}
 */
export function getContext() {
  if (!liffObject) return null
  return liffObject.getContext()
}

/**
 * OSを取得
 * @returns {string} - 'ios' | 'android' | 'web'
 */
export function getOS() {
  if (!liffObject) return 'web'
  return liffObject.getOS()
}

/**
 * LINEバージョンを取得
 * @returns {string|null}
 */
export function getLineVersion() {
  if (!liffObject) return null
  return liffObject.getLineVersion()
}
