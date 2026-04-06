import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { rateLimit, resolveRateLimit } from '@/lib/rate-limit'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

const resend = new Resend(process.env.RESEND_API_KEY)

// 6桁のランダムコードを生成
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request) {
  try {
    const { limit, windowMs } = resolveRateLimit({
      key: 'verification-send',
      limit: 5,
      windowMs: 60_000,
    })
    const rate = await rateLimit(request, {
      key: 'verification-send',
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

    const supabase = createAdminClient()
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10分後

    // 既存の未使用コードを無効化（同じメールアドレスに対して）
    await supabase
      .from('verification_codes')
      .delete()
      .eq('email', email)
      .eq('verification_type', 'email')
      .is('verified_at', null)

    // 新しい認証コードを保存
    const { error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        email,
        verification_type: 'email',
        code,
        expires_at: expiresAt.toISOString(),
      })

    if (insertError) {
      return internalErrorResponse('Verification code save', insertError)
    }

    // メール送信
    const { error: emailError } = await resend.emails.send({
      from: 'FLOLIA <noreply@flolia.jp>',
      to: email,
      subject: '【FLOLIA】メールアドレス認証コード',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">FLOLIA メールアドレス認証</h2>
          <p>入会登録のためのメールアドレス認証コードをお送りします。</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">認証コード</p>
            <p style="margin: 10px 0; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #7c3aed;">${code}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            このコードは10分間有効です。<br>
            心当たりのない場合は、このメールを無視してください。
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px;">
            FLOLIA - キックボクシングスタジオ
          </p>
        </div>
      `,
    })

    if (emailError) {
      return internalErrorResponse('Verification email send', emailError)
    }

    return okResponse({
      success: true,
      message: 'メールに認証コードを送信しました',
    })
  } catch (error) {
    return internalErrorResponse('Verification send', error)
  }
}
