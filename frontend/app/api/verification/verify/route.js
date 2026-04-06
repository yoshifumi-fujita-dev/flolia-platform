import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

const MAX_ATTEMPTS = 5 // 最大試行回数

export async function POST(request) {
  try {
    const { email, code } = await request.json()

    if (!email) {
      return badRequestResponse('メールアドレスを入力してください')
    }

    if (!code || code.length !== 6) {
      return badRequestResponse('6桁の認証コードを入力してください')
    }

    const testVerificationCode = process.env.TEST_VERIFICATION_CODE
    if (process.env.NODE_ENV === 'development' && testVerificationCode && code === testVerificationCode) {
      const supabase = createAdminClient()
      const verifiedAt = new Date().toISOString()

      const { data: codes } = await supabase
        .from('verification_codes')
        .select('id')
        .eq('email', email)
        .eq('verification_type', 'email')
        .is('verified_at', null)
        .order('created_at', { ascending: false })
        .limit(1)

      if (codes && codes[0]) {
        await supabase
          .from('verification_codes')
          .update({ verified_at: verifiedAt })
          .eq('id', codes[0].id)
      }

      return okResponse({
        success: true,
        verified: true,
        verifiedAt,
        message: 'メールアドレスが認証されました',
        bypassed: true,
      })
    }

    const supabase = createAdminClient()

    // 認証コードを取得
    const { data: codes, error: fetchError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('email', email)
      .eq('verification_type', 'email')
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError) {
      return internalErrorResponse('Verification code fetch', fetchError)
    }

    if (!codes || codes.length === 0) {
      return badRequestResponse('認証コードが見つからないか、有効期限が切れています。再送信してください。')
    }

    const verificationCode = codes[0]

    // 試行回数チェック
    if (verificationCode.attempts >= MAX_ATTEMPTS) {
      return badRequestResponse('試行回数の上限に達しました。新しいコードを再送信してください。')
    }

    // 試行回数を更新
    await supabase
      .from('verification_codes')
      .update({ attempts: verificationCode.attempts + 1 })
      .eq('id', verificationCode.id)

    // コード照合
    if (verificationCode.code !== code) {
      const remainingAttempts = MAX_ATTEMPTS - verificationCode.attempts - 1
      return badRequestResponse(`認証コードが一致しません。残り${remainingAttempts}回試行できます。`)
    }

    // 認証成功 - verified_atを更新
    const verifiedAt = new Date().toISOString()
    await supabase
      .from('verification_codes')
      .update({ verified_at: verifiedAt })
      .eq('id', verificationCode.id)

    return okResponse({
      success: true,
      verified: true,
      verifiedAt,
      message: 'メールアドレスが認証されました',
    })
  } catch (error) {
    return internalErrorResponse('Verification', error)
  }
}
