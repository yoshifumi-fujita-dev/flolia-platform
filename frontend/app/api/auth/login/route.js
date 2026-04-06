import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { rateLimit, resolveRateLimit } from '@/lib/rate-limit'
import { okResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

export async function POST(request) {
  try {
    const { limit, windowMs } = resolveRateLimit({
      key: 'staff-login',
      limit: 5,
      windowMs: 60_000,
    })
    const rate = await rateLimit(request, {
      key: 'staff-login',
      limit,
      windowMs,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'リクエストが多すぎます。しばらく待ってから再試行してください。' },
        {
          status: 429,
          headers: { 'Retry-After': rate.retryAfter.toString() },
        }
      )
    }

    const { email, password, qr_token } = await request.json()

    const adminSupabase = createAdminClient()
    let staffUser = null
    let authUserId = null

    // QRトークンでのログイン
    if (qr_token) {
      const { data: staffByQr } = await adminSupabase
        .from('staff')
        .select('id, name, email, auth_user_id, role_id, is_active, roles(name, display_name)')
        .eq('qr_token', qr_token)
        .single()

      if (!staffByQr) {
        return unauthorizedResponse('無効なQRコードです')
      }

      if (!staffByQr.auth_user_id) {
        return forbiddenResponse('このスタッフはログインアカウントが設定されていません')
      }

      staffUser = staffByQr
      authUserId = staffByQr.auth_user_id

      // QRログインの場合もSupabase Authセッションを作成
      // auth_user_idからメールアドレスを取得してサインイン
      const { data: authUser } = await adminSupabase.auth.admin.getUserById(staffByQr.auth_user_id)
      if (authUser?.user?.email) {
        const supabase = await createClient()
        // 管理者APIで一時的なセッションを作成
        const { data: sessionData, error: sessionError } = await adminSupabase.auth.admin.generateLink({
          type: 'magiclink',
          email: authUser.user.email,
        })
        // Magic linkのトークンを使ってセッションを確立（OTP検証）
        if (sessionData?.properties?.hashed_token) {
          await supabase.auth.verifyOtp({
            token_hash: sessionData.properties.hashed_token,
            type: 'magiclink',
          })
        }
      }
    }
    // メール・パスワードでのログイン
    else if (email && password) {
      const supabase = await createClient()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('Auth error:', error)
        return unauthorizedResponse('メールアドレスまたはパスワードが正しくありません')
      }

      authUserId = data.user.id

      // まずstaffテーブルをチェック
      const { data: staffByAuth } = await adminSupabase
        .from('staff')
        .select('id, name, email, role_id, is_active, roles(name, display_name)')
        .eq('auth_user_id', data.user.id)
        .single()

      staffUser = staffByAuth
    } else {
      return badRequestResponse('メールアドレスとパスワード、またはQRコードが必要です')
    }

    if (!staffUser) {
      // staffテーブルに存在しない場合はログアウト
      if (!qr_token) {
        const supabase = await createClient()
        await supabase.auth.signOut()
      }
      return forbiddenResponse('管理者権限がありません。従業員管理でログインアカウントを設定してください。')
    }

    // staffテーブルに存在する場合
    if (!staffUser.is_active) {
      if (!qr_token) {
        const supabase = await createClient()
        await supabase.auth.signOut()
      }
      return forbiddenResponse('このアカウントは無効化されています')
    }

    // ログイン成功の監査ログを記録
    await createAuditLog({
      action: 'login',
      tableName: 'auth',
      adminUser: {
        id: staffUser.id,
        email: staffUser.email,
        name: staffUser.name,
      },
      request,
      description: `${staffUser.name}がログインしました${qr_token ? '（QR）' : ''}`,
    })

    return okResponse({
      success: true,
      user: {
        id: authUserId,
        email: staffUser.email,
        name: staffUser.name,
        role: staffUser.roles?.name || 'staff',
        role_display_name: staffUser.roles?.display_name || 'スタッフ',
      }
    })

  } catch (error) {
    return internalErrorResponse('Login', error)
  }
}
