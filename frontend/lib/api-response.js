import { NextResponse } from 'next/server'

/**
 * 成功レスポンス（データあり）
 * @param {object} data - レスポンスデータ
 * @param {number} status - HTTPステータスコード（デフォルト200）
 */
export function okResponse(data, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * 成功レスポンス（操作完了、データなし）
 */
export function successResponse() {
  return NextResponse.json({ success: true })
}

/**
 * 400 Bad Request
 * @param {string} message - エラーメッセージ
 * @param {string} errorCode - 機械可読エラーコード（省略時: INVALID_REQUEST）
 */
export function badRequestResponse(message, errorCode = 'INVALID_REQUEST') {
  return NextResponse.json({ success: false, error: message, error_code: errorCode }, { status: 400 })
}

/**
 * 401 Unauthorized
 * @param {string} message - エラーメッセージ
 */
export function unauthorizedResponse(message = '認証されていません') {
  console.warn('[auth] 401 UNAUTHORIZED:', message)
  return NextResponse.json({ success: false, error: message, error_code: 'UNAUTHORIZED' }, { status: 401 })
}

/**
 * 403 Forbidden
 * @param {string} message - エラーメッセージ
 * @param {string} errorCode - 機械可読エラーコード（省略時: PERMISSION_DENIED）
 */
export function forbiddenResponse(message = 'アクセス権限がありません', errorCode = 'PERMISSION_DENIED') {
  console.warn('[auth] 403 PERMISSION_DENIED:', message)
  return NextResponse.json({ success: false, error: message, error_code: errorCode }, { status: 403 })
}

/**
 * 404 Not Found
 * @param {string} message - エラーメッセージ
 */
export function notFoundResponse(message = 'リソースが見つかりません') {
  return NextResponse.json({ success: false, error: message, error_code: 'NOT_FOUND' }, { status: 404 })
}

/**
 * 409 Conflict
 * @param {string} message - エラーメッセージ
 * @param {string} errorCode - 機械可読エラーコード（省略時: CONFLICT）
 */
export function conflictResponse(message, errorCode = 'CONFLICT') {
  return NextResponse.json({ success: false, error: message, error_code: errorCode }, { status: 409 })
}

/**
 * 429 Too Many Requests
 * @param {string} message - エラーメッセージ
 */
export function tooManyRequestsResponse(message = 'リクエストが多すぎます。しばらく待ってから再試行してください') {
  return NextResponse.json({ success: false, error: message, error_code: 'RATE_LIMITED' }, { status: 429 })
}

/**
 * 500 Internal Server Error
 * catchブロックで使用する汎用エラーハンドラー
 * @param {string} context - ログ用コンテキスト（例: 'Member GET'）
 * @param {unknown} error - キャッチしたエラー
 */
export function internalErrorResponse(context, error) {
  console.error(`[error] ${context}:`, error)
  return NextResponse.json({ success: false, error: 'サーバーエラーが発生しました', error_code: 'INTERNAL_ERROR' }, { status: 500 })
}

/**
 * Supabaseのエラーコードに応じたレスポンスを返す
 * @param {string} context - ログ用コンテキスト
 * @param {object} supabaseError - Supabaseのエラーオブジェクト
 * @param {string} defaultMessage - デフォルトエラーメッセージ
 */
export function supabaseErrorResponse(context, supabaseError, defaultMessage) {
  console.error(`[error] ${context}:`, supabaseError)
  if (supabaseError.code === '23505') {
    return conflictResponse('このデータは既に登録されています', 'DUPLICATE_ENTRY')
  }
  return NextResponse.json({ success: false, error: defaultMessage, error_code: 'INTERNAL_ERROR' }, { status: 500 })
}
