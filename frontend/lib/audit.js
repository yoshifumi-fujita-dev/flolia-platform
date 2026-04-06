/**
 * 監査ログユーティリティ
 * 管理画面での操作履歴を記録するためのヘルパー関数
 */

import { createAdminClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'

/**
 * テーブル名の日本語マッピング
 */
const TABLE_NAMES_JA = {
  members: '会員',
  bookings: '予約',
  payments: '決済',
  classes: 'クラス',
  class_schedules: 'スケジュール',
  membership_plans: '料金プラン',
  stores: '店舗',
  announcements: 'お知らせ',
  staff: '従業員',
  auth: '認証',
  schedule_exceptions: '休講設定',
}

/**
 * 操作種別の日本語マッピング
 */
const ACTION_NAMES_JA = {
  create: '作成',
  update: '更新',
  delete: '削除',
  login: 'ログイン',
  logout: 'ログアウト',
  export: 'エクスポート',
}

/**
 * 変更点を抽出する
 * @param {Object} oldData - 変更前のデータ
 * @param {Object} newData - 変更後のデータ
 * @returns {Object} 変更されたフィールドのみ
 */
export function extractChanges(oldData, newData) {
  if (!oldData || !newData) return null

  const changes = {}
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

  for (const key of allKeys) {
    // タイムスタンプは除外
    if (key === 'updated_at' || key === 'created_at') continue

    const oldValue = oldData[key]
    const newValue = newData[key]

    // JSONの深い比較
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[key] = {
        old: oldValue,
        new: newValue,
      }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

/**
 * 操作の説明を生成する
 * @param {string} action - 操作種別
 * @param {string} tableName - テーブル名
 * @param {Object} data - 関連データ
 * @returns {string} 操作の説明
 */
export function generateDescription(action, tableName, data = {}) {
  const tableNameJa = TABLE_NAMES_JA[tableName] || tableName
  const actionJa = ACTION_NAMES_JA[action] || action

  // 特定のテーブルには識別情報を追加
  let identifier = ''
  if (data) {
    if (tableName === 'members' && data.name) {
      identifier = `（${data.name}）`
    } else if (tableName === 'bookings' && data.member_name) {
      identifier = `（${data.member_name}）`
    } else if (tableName === 'classes' && data.name) {
      identifier = `（${data.name}）`
    } else if (tableName === 'membership_plans' && data.name) {
      identifier = `（${data.name}）`
    } else if (tableName === 'announcements' && data.title) {
      identifier = `（${data.title}）`
    }
  }

  return `${tableNameJa}${identifier}を${actionJa}`
}

/**
 * 監査ログを記録する
 * @param {Object} params - パラメータ
 * @param {string} params.action - 操作種別 (create/update/delete/login/logout/export)
 * @param {string} params.tableName - テーブル名
 * @param {string} [params.recordId] - レコードID
 * @param {Object} [params.oldData] - 変更前のデータ
 * @param {Object} [params.newData] - 変更後のデータ
 * @param {Object} [params.adminUser] - 管理者情報 { id, email, name }
 * @param {Request} [params.request] - HTTPリクエスト（IP、User-Agent取得用）
 * @param {string} [params.description] - カスタム説明
 * @returns {Promise<Object>} 作成された監査ログ
 */
export async function createAuditLog({
  action,
  tableName,
  recordId = null,
  oldData = null,
  newData = null,
  adminUser = null,
  request = null,
  description = null,
}) {
  try {
    const supabase = createAdminClient()

    // 変更点を抽出
    const changes = action === 'update' ? extractChanges(oldData, newData) : null

    // IPアドレスとUser-Agentを取得
    let ipAddress = null
    let userAgent = null
    if (request) {
      // Next.jsのrequestからヘッダーを取得
      ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        null
      userAgent = request.headers.get('user-agent') || null
    }

    // adminUserが渡されていない場合、ログインユーザーを取得
    let resolvedAdminUser = adminUser
    if (!resolvedAdminUser && request) {
      try {
        // requestのcookieからSupabaseクライアントを作成
        const cookieHeader = request.headers.get('cookie') || ''
        const cookies = {}
        cookieHeader.split(';').forEach(cookie => {
          const [name, ...rest] = cookie.trim().split('=')
          if (name) cookies[name] = rest.join('=')
        })

        const authSupabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          {
            cookies: {
              getAll() {
                return Object.entries(cookies).map(([name, value]) => ({ name, value }))
              },
              setAll() {
                // 読み取り専用
              },
            },
          }
        )

        const { data: { user } } = await authSupabase.auth.getUser()

        if (user) {
          // staffテーブルから情報を取得
          const { data: staff } = await supabase
            .from('staff')
            .select('id, email, name')
            .eq('auth_user_id', user.id)
            .eq('is_active', true)
            .single()

          if (staff) {
            resolvedAdminUser = staff
          } else {
            // staffテーブルに見つからない場合、認証ユーザーの情報を直接使用
            const emailName = user.email ? user.email.split('@')[0] : '不明'
            resolvedAdminUser = {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || emailName,
            }
          }
        }
      } catch (authError) {
        console.error('Failed to get auth user for audit log:', authError)
      }
    }

    // 説明を生成
    const desc = description || generateDescription(action, tableName, newData || oldData)

    // 監査ログを挿入
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        admin_user_id: resolvedAdminUser?.id || null,
        admin_email: resolvedAdminUser?.email || null,
        admin_name: resolvedAdminUser?.name || null,
        action,
        table_name: tableName,
        record_id: recordId,
        old_data: oldData,
        new_data: newData,
        changes,
        ip_address: ipAddress,
        user_agent: userAgent,
        description: desc,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create audit log:', error)
      // 監査ログの失敗は主処理をブロックしない
      return null
    }

    return data
  } catch (error) {
    console.error('Audit log error:', error)
    // 監査ログの失敗は主処理をブロックしない
    return null
  }
}

/**
 * スタッフ情報を取得するヘルパー
 * @param {string} userId - auth.uid
 * @returns {Promise<Object|null>} スタッフ情報
 */
export async function getStaffUser(userId) {
  if (!userId) return null

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('staff')
      .select('id, email, name')
      .eq('auth_user_id', userId)
      .eq('is_active', true)
      .single()

    if (error) return null
    return data
  } catch {
    return null
  }
}

// 後方互換性のため残す（非推奨）
export const getAdminUser = getStaffUser

/**
 * センシティブなフィールドをマスクする
 * @param {Object} data - データ
 * @returns {Object} マスクされたデータ
 */
export function maskSensitiveData(data) {
  if (!data) return data

  const sensitiveFields = [
    'stripe_customer_id',
    'stripe_subscription_id',
    'stripe_payment_intent_id',
    'password',
    'password_hash',
  ]

  const masked = { ...data }
  for (const field of sensitiveFields) {
    if (masked[field]) {
      masked[field] = '***MASKED***'
    }
  }

  return masked
}

export default {
  createAuditLog,
  extractChanges,
  generateDescription,
  getStaffUser,
  getAdminUser, // 後方互換性
  maskSensitiveData,
  TABLE_NAMES_JA,
  ACTION_NAMES_JA,
}
