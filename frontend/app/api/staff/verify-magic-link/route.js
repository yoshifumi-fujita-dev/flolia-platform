import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: マジックリンクを検証
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return badRequestResponse('トークンが必要です')
    }

    const supabase = createAdminClient()

    // マジックリンクを検索
    const { data: magicLink, error: linkError } = await supabase
      .from('staff_magic_links')
      .select(`
        id,
        staff_id,
        expires_at,
        used_at,
        staff:staff_id (
          id,
          name,
          email,
          is_active,
          auth_user_id
        )
      `)
      .eq('token', token)
      .single()

    if (linkError || !magicLink) {
      return badRequestResponse('無効なトークンです')
    }

    // 使用済みチェック
    if (magicLink.used_at) {
      return badRequestResponse('このリンクは既に使用されています')
    }

    // 有効期限チェック
    if (new Date(magicLink.expires_at) < new Date()) {
      return badRequestResponse('リンクの有効期限が切れています')
    }

    const staff = magicLink.staff

    // スタッフが有効かチェック
    if (!staff || !staff.is_active) {
      return forbiddenResponse('スタッフアカウントが無効です')
    }

    // Supabase Authアカウントがあるかチェック
    if (!staff.auth_user_id) {
      return badRequestResponse('パスワード設定が完了していません')
    }

    // マジックリンクを使用済みに更新
    await supabase
      .from('staff_magic_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', magicLink.id)

    return okResponse({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        auth_user_id: staff.auth_user_id,
      },
    })
  } catch (error) {
    return internalErrorResponse('Staff verify-magic-link API', error)
  }
}
