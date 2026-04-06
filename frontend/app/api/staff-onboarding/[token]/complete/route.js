import { createClient } from '@supabase/supabase-js'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// Service Role クライアント
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST: オンボーディング完了（パスワード設定）
export async function POST(request, { params }) {
  try {
    const { token } = await params
    const body = await request.json()
    const { password } = body

    if (!password || password.length < 8) {
      return badRequestResponse('パスワードは8文字以上で入力してください')
    }

    // 招待トークンを検証
    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .select('*, staff:staff_id(*)')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return notFoundResponse('無効な招待リンクです')
    }

    // 有効期限チェック
    if (new Date(invitation.expires_at) < new Date()) {
      return badRequestResponse('招待リンクの有効期限が切れています')
    }

    // LINE連携済みかチェック（LINE連携は必須）
    if (invitation.staff.onboarding_status !== 'line_linked') {
      // 契約署名済みだがLINE連携がまだの場合
      if (invitation.staff.onboarding_status === 'contract_signed') {
        return badRequestResponse('LINE連携が完了していません')
      }
      return badRequestResponse('契約書への署名とLINE連携が完了していません')
    }

    const staff = invitation.staff

    // 既存のAuthユーザーがいるか確認
    let authUserId = staff.auth_user_id

    if (!authUserId) {
      // 新規Authユーザーを作成
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: staff.email,
        password,
        email_confirm: true, // メール確認済みとして作成
        user_metadata: {
          name: staff.name,
          staff_id: staff.id,
        },
      })

      if (authError) {
        console.error('Auth user create error:', authError)

        // 既存ユーザーがいる場合はパスワードリセット
        if (authError.message?.includes('already been registered')) {
          // 既存ユーザーを取得
          const { data: existingUsers } = await supabase.auth.admin.listUsers()
          const existingUser = existingUsers?.users?.find(u => u.email === staff.email)

          if (existingUser) {
            // パスワードを更新
            const { error: updateError } = await supabase.auth.admin.updateUserById(
              existingUser.id,
              { password }
            )

            if (updateError) {
              return internalErrorResponse('Password update', updateError)
            }

            authUserId = existingUser.id
          }
        } else {
          return internalErrorResponse('Auth user create', authError)
        }
      } else {
        authUserId = authUser.user.id
      }

      // スタッフにAuthユーザーIDを紐付け
      await supabase
        .from('staff')
        .update({ auth_user_id: authUserId })
        .eq('id', staff.id)
    } else {
      // 既存ユーザーのパスワードを更新
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUserId,
        { password }
      )

      if (updateError) {
        return internalErrorResponse('Password update', updateError)
      }
    }

    // スタッフのステータスを完了に更新
    await supabase
      .from('staff')
      .update({
        onboarding_status: 'completed',
        is_active: true,
      })
      .eq('id', staff.id)

    // 招待を完了済みに更新
    await supabase
      .from('staff_invitations')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)

    return okResponse({
      success: true,
      message: '従業員登録が完了しました',
    })
  } catch (error) {
    return internalErrorResponse('Onboarding complete', error)
  }
}
