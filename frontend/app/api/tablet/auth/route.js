import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// タブレット用スタッフ認証API
export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, qr_token } = body

    const adminSupabase = createAdminClient()
    let staffUser = null

    // QRトークンでのログイン
    if (qr_token) {
      const { data: staffByQr } = await adminSupabase
        .from('staff')
        .select('id, name, email, role_id, is_active, assigned_store_ids, roles(name, display_name)')
        .eq('qr_token', qr_token)
        .single()

      if (!staffByQr) {
        return unauthorizedResponse('無効なQRコードです')
      }

      staffUser = staffByQr
    }
    // メール・パスワードでのログイン
    else if (email && password) {
      const supabase = await createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return unauthorizedResponse('メールアドレスまたはパスワードが正しくありません')
      }

      const { data: staffByAuth } = await adminSupabase
        .from('staff')
        .select('id, name, email, role_id, is_active, assigned_store_ids, roles(name, display_name)')
        .eq('auth_user_id', data.user.id)
        .single()

      if (!staffByAuth) {
        await supabase.auth.signOut()
        return forbiddenResponse('スタッフ権限がありません')
      }

      staffUser = staffByAuth
    } else {
      return badRequestResponse('メールアドレスとパスワード、またはQRコードが必要です')
    }

    if (!staffUser.is_active) {
      return forbiddenResponse('このアカウントは無効化されています')
    }

    // タブレットログインの監査ログを記録
    await createAuditLog({
      action: 'tablet_login',
      tableName: 'auth',
      adminUser: {
        id: staffUser.id,
        email: staffUser.email,
        name: staffUser.name,
      },
      request,
      description: `${staffUser.name}がタブレット（スタッフメニュー）にログインしました${qr_token ? '（QR）' : ''}`,
    })

    // セッショントークンを生成（24時間有効）
    const sessionToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24時間後

    // タブレットセッションをDBに保存
    await adminSupabase.from('tablet_sessions').insert({
      token: sessionToken,
      staff_id: staffUser.id,
      staff_name: staffUser.name,
      expires_at: expiresAt,
    })

    // 担当店舗情報を取得（assigned_store_idsの最初の店舗）
    let storeInfo = null
    if (staffUser.assigned_store_ids && staffUser.assigned_store_ids.length > 0) {
      const { data: store } = await adminSupabase
        .from('stores')
        .select('id, name, site_slug')
        .eq('id', staffUser.assigned_store_ids[0])
        .single()
      storeInfo = store
    }

    return okResponse({
      success: true,
      session: {
        token: sessionToken,
        staff_id: staffUser.id,
        staff_name: staffUser.name,
        store_id: storeInfo?.id || null,
        store_slug: storeInfo?.site_slug || null,
        store_name: storeInfo?.name || null,
        assigned_store_ids: staffUser.assigned_store_ids || [],
        expires_at: expiresAt,
      },
    })

  } catch (error) {
    return internalErrorResponse('Tablet auth', error)
  }
}

// セッション検証API
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return badRequestResponse('トークンが必要です')
    }

    const adminSupabase = createAdminClient()

    const { data: session } = await adminSupabase
      .from('tablet_sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return unauthorizedResponse('セッションが無効または期限切れです')
    }

    // staff情報から店舗情報を取得
    const { data: staff } = await adminSupabase
      .from('staff')
      .select('id, assigned_store_ids')
      .eq('id', session.staff_id)
      .single()

    // 担当店舗情報を取得（assigned_store_idsの最初の店舗）
    let storeInfo = null
    if (staff?.assigned_store_ids && staff.assigned_store_ids.length > 0) {
      const { data: store } = await adminSupabase
        .from('stores')
        .select('id, name, site_slug')
        .eq('id', staff.assigned_store_ids[0])
        .single()
      storeInfo = store
    }

    return okResponse({
      valid: true,
      session: {
        staff_id: session.staff_id,
        staff_name: session.staff_name,
        store_id: storeInfo?.id || null,
        store_slug: storeInfo?.site_slug || null,
        store_name: storeInfo?.name || null,
        assigned_store_ids: staff?.assigned_store_ids || [],
        expires_at: session.expires_at,
      },
    })

  } catch (error) {
    return internalErrorResponse('Session verification', error)
  }
}

// ログアウトAPI
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return badRequestResponse('トークンが必要です')
    }

    const adminSupabase = createAdminClient()

    await adminSupabase
      .from('tablet_sessions')
      .delete()
      .eq('token', token)

    return successResponse()

  } catch (error) {
    return internalErrorResponse('Logout', error)
  }
}
