import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// POST: 従業員にログインアカウントを作成
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

    // 既にアカウントがある場合
    if (staff.auth_user_id) {
      return badRequestResponse('この従業員には既にログインアカウントがあります')
    }

    // Supabase Authでユーザー作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: staff.email,
      password: password,
      email_confirm: true, // メール確認をスキップ
      user_metadata: {
        name: staff.name,
        staff_id: staff.id,
      },
    })

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        return badRequestResponse('このメールアドレスは既に登録されています')
      }
      return internalErrorResponse('Auth create', authError)
    }

    // staffテーブルのauth_user_idを更新
    const { error: updateError } = await supabase
      .from('staff')
      .update({
        auth_user_id: authData.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      // ロールバック: 作成したAuthユーザーを削除
      await supabase.auth.admin.deleteUser(authData.user.id)
      throw updateError
    }

    return okResponse({
      success: true,
      message: 'ログインアカウントを作成しました',
      user_id: authData.user.id,
    })
  } catch (error) {
    return internalErrorResponse('Create account', error)
  }
}
