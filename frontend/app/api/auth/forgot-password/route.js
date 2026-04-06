import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { resend } from '@/lib/resend/client'
import { rateLimit, resolveRateLimit } from '@/lib/rate-limit'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// Service Role用のSupabaseクライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { limit, windowMs } = resolveRateLimit({
      key: 'staff-forgot-password',
      limit: 5,
      windowMs: 60_000,
    })
    const rate = await rateLimit(request, {
      key: 'staff-forgot-password',
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

    const { email } = await request.json()

    if (!email) {
      return badRequestResponse('メールアドレスを入力してください')
    }

    // スタッフテーブルでメールアドレスを確認
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, name, auth_user_id, is_active')
      .eq('email', email)
      .single()

    // スタッフが存在しない場合でもセキュリティのため同じレスポンスを返す
    if (staffError || !staff) {
      // セキュリティ：存在しないメールでも成功メッセージを返す
      return okResponse({
        success: true,
        message: 'メールアドレスが登録されている場合、パスワードリセットのメールを送信しました'
      })
    }

    // アカウントが無効化されている場合
    if (!staff.is_active) {
      return okResponse({
        success: true,
        message: 'メールアドレスが登録されている場合、パスワードリセットのメールを送信しました'
      })
    }

    // auth_user_idがない（ログインアカウントが未作成）
    if (!staff.auth_user_id) {
      return okResponse({
        success: true,
        message: 'メールアドレスが登録されている場合、パスワードリセットのメールを送信しました'
      })
    }

    // 6桁のリセットコードを生成
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString()

    // 有効期限（30分）
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    // 既存の未使用コードを削除
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('verification_type', 'password_reset')
      .is('verified_at', null)

    // 新しいコードを保存
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        email,
        code: resetCode,
        verification_type: 'password_reset',
        expires_at: expiresAt.toISOString(),
        attempts: 0
      })

    if (insertError) {
      return internalErrorResponse('Reset code insert', insertError)
    }

    // メール送信
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/backoffice/reset-password?email=${encodeURIComponent(email)}`

    try {
      await resend.emails.send({
        from: 'FLOLIA <noreply@flolia.jp>',
        to: [email],
        subject: '【FLOLIA】パスワードリセットのご案内',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #7c3aed;">FLOLIA 管理システム</h2>
            <p>${staff.name}様</p>
            <p>パスワードリセットのリクエストを受け付けました。</p>
            <p>以下の認証コードを入力して、新しいパスワードを設定してください。</p>

            <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">認証コード</p>
              <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed; margin: 0;">
                ${resetCode}
              </p>
            </div>

            <p style="color: #dc2626; font-size: 14px;">
              ※このコードは30分間有効です。
            </p>

            <p>
              <a href="${resetUrl}"
                 style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                パスワードをリセット
              </a>
            </p>

            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              このメールに心当たりがない場合は、無視してください。<br>
              パスワードは変更されません。
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              FLOLIA Kickboxing Studio<br>
              株式会社FLOLIA
            </p>
          </div>
        `,
      })
    } catch (emailError) {
      return internalErrorResponse('Email send', emailError)
    }

    return okResponse({
      success: true,
      message: 'メールアドレスが登録されている場合、パスワードリセットのメールを送信しました'
    })

  } catch (error) {
    return internalErrorResponse('Forgot password', error)
  }
}
