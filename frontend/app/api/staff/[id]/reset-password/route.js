import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// POST: パスワードをリセット
export async function POST(request, { params }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { password } = body

    if (!password || password.length < 8) {
      return badRequestResponse('パスワードは8文字以上で入力してください')
    }

    // 従業員情報を取得
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', id)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('従業員が見つかりません')
    }

    if (!staff.auth_user_id) {
      return badRequestResponse('この従業員にはログインアカウントがありません')
    }

    // パスワードを更新
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      staff.auth_user_id,
      { password: password }
    )

    if (updateError) {
      return internalErrorResponse('Password reset', updateError)
    }

    return okResponse({
      success: true,
      message: 'パスワードをリセットしました',
    })
  } catch (error) {
    return internalErrorResponse('Reset password', error)
  }
}
