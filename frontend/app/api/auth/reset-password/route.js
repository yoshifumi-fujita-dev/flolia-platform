import { createClient } from '@supabase/supabase-js'
import { okResponse, badRequestResponse, notFoundResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

// Service Role用のSupabaseクライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, code, newPassword } = await request.json()

    if (!email || !code || !newPassword) {
      return badRequestResponse('すべての項目を入力してください')
    }

    // パスワードの長さチェック
    if (newPassword.length < 8) {
      return badRequestResponse('パスワードは8文字以上で設定してください')
    }

    // 認証コードを検証
    const { data: verificationCode, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('verification_type', 'password_reset')
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (codeError || !verificationCode) {
      // 試行回数をカウントするために、コードなしで検索
      const { data: latestCode } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('verification_type', 'password_reset')
        .is('verified_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (latestCode) {
        // 試行回数をインクリメント
        const newAttempts = (latestCode.attempts || 0) + 1
        await supabase
          .from('verification_codes')
          .update({ attempts: newAttempts })
          .eq('id', latestCode.id)

        if (newAttempts >= 5) {
          return badRequestResponse('試行回数の上限に達しました。再度リセットメールを送信してください。')
        }

        return badRequestResponse(`認証コードが一致しません。残り${5 - newAttempts}回試行できます。`)
      }

      return badRequestResponse('認証コードが無効または期限切れです。再度リセットメールを送信してください。')
    }

    // 試行回数チェック
    if (verificationCode.attempts >= 5) {
      return badRequestResponse('試行回数の上限に達しました。再度リセットメールを送信してください。')
    }

    // スタッフ情報を取得
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, auth_user_id, is_active')
      .eq('email', email)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('アカウントが見つかりません')
    }

    if (!staff.is_active) {
      return forbiddenResponse('このアカウントは無効化されています')
    }

    if (!staff.auth_user_id) {
      return badRequestResponse('ログインアカウントが設定されていません')
    }

    // Supabase Authのパスワードを更新
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      staff.auth_user_id,
      { password: newPassword }
    )

    if (updateError) {
      return internalErrorResponse('Password update', updateError)
    }

    // 認証コードを使用済みにする
    await supabase
      .from('verification_codes')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', verificationCode.id)

    return okResponse({
      success: true,
      message: 'パスワードが正常に更新されました'
    })

  } catch (error) {
    return internalErrorResponse('Reset password', error)
  }
}
