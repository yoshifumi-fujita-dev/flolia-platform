import { requireStaffSession } from '@/lib/auth/staff'
import { Resend } from 'resend'
import crypto from 'crypto'
import { okResponse, badRequestResponse, forbiddenResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

const resend = new Resend(process.env.RESEND_API_KEY)

// POST: 従業員に招待メールを送信
export async function POST(request, { params }) {
  try {
    const { adminSupabase, staff: currentStaff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    // 権限チェック（admin または Super Admin のみ）
    const roleName = currentStaff.roles?.name
    if (roleName !== 'admin' && roleName !== 'Super Admin') {
      return forbiddenResponse('招待を送信する権限がありません')
    }

    // 対象スタッフを取得
    const { data: targetStaff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single()

    if (staffError || !targetStaff) {
      return notFoundResponse('従業員が見つかりません')
    }

    // 既に完了済みの場合はエラー
    if (targetStaff.onboarding_status === 'completed') {
      return badRequestResponse('この従業員は既にオンボーディングを完了しています')
    }

    // 既存の有効な招待を無効化
    await supabase
      .from('staff_invitations')
      .update({ status: 'cancelled' })
      .eq('staff_id', id)
      .eq('status', 'pending')

    // 招待トークンを生成
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7日間有効

    // 招待レコードを作成
    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .insert({
        staff_id: id,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        sent_at: new Date().toISOString(),
        sent_count: 1,
      })
      .select()
      .single()

    if (inviteError) {
      return internalErrorResponse('Invitation create', inviteError)
    }

    // 招待メールを送信
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/staff/onboarding/${token}`

    const { error: emailError } = await resend.emails.send({
      from: 'FLOLIA <noreply@flolia.jp>',
      to: targetStaff.email,
      subject: '【FLOLIA】従業員登録のご案内',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">FLOLIA</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">従業員登録のご案内</p>
          </div>

          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p>${targetStaff.name} 様</p>

            <p>この度はFLOLIAへのご入社、誠にありがとうございます。</p>

            <p>下記のリンクより従業員登録を完了してください。<br>
            登録では契約書の確認・署名、パスワードの設定を行います。</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold;">
                従業員登録を開始する
              </a>
            </div>

            <p style="color: #666; font-size: 14px;">
              このリンクの有効期限は<strong>7日間</strong>です。<br>
              期限が切れた場合は、管理者に再送信を依頼してください。
            </p>

            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

            <p style="color: #999; font-size: 12px;">
              このメールに心当たりがない場合は、このメールを無視してください。<br>
              ご不明点がございましたら、管理者までお問い合わせください。
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
            <p>&copy; FLOLIA All Rights Reserved.</p>
          </div>
        </body>
        </html>
      `,
    })

    if (emailError) {
      // メール送信失敗しても招待レコードは作成済みなので、部分的成功として扱う
      return okResponse({
        success: true,
        invitation,
        warning: 'メール送信に失敗しました。URLを直接共有してください。',
        inviteUrl,
      })
    }

    // スタッフのステータスを更新
    await supabase
      .from('staff')
      .update({ onboarding_status: 'invited' })
      .eq('id', id)

    return okResponse({
      success: true,
      invitation,
      message: '招待メールを送信しました',
    })
  } catch (error) {
    return internalErrorResponse('Staff invite', error)
  }
}

// GET: 招待状況を取得
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    const { data: invitations, error } = await supabase
      .from('staff_invitations')
      .select('*')
      .eq('staff_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return okResponse({ invitations })
  } catch (error) {
    return internalErrorResponse('Staff invitations fetch', error)
  }
}
