import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, forbiddenResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: LINE User IDからスタッフ情報を取得（LIFF用）
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('line_user_id')

    if (!lineUserId) {
      return badRequestResponse('LINE User IDが必要です')
    }

    const supabase = createAdminClient()

    // スタッフをLINE User IDで検索
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select(`
        id,
        name,
        name_kana,
        email,
        phone,
        role_id,
        is_active,
        auth_user_id,
        line_user_id,
        roles (
          id,
          name,
          permissions
        )
      `)
      .eq('line_user_id', lineUserId)
      .single()

    if (staffError || !staff) {
      return notFoundResponse('スタッフが見つかりません。LINE連携が完了していない可能性があります。')
    }

    // 無効なスタッフはアクセス拒否
    if (!staff.is_active) {
      return forbiddenResponse('このアカウントは無効化されています')
    }

    // インストラクター情報を取得（スタッフがインストラクターの場合）
    let instructor = null
    const { data: instructorData } = await supabase
      .from('instructors')
      .select('id, name, name_kana, image_url, qr_code_token, is_active')
      .eq('line_user_id', lineUserId)
      .eq('is_active', true)
      .single()

    if (instructorData) {
      instructor = instructorData
    }

    return okResponse({
      staff: {
        id: staff.id,
        name: staff.name,
        name_kana: staff.name_kana,
        email: staff.email,
        role: staff.roles?.name || null,
        permissions: staff.roles?.permissions || [],
        is_active: staff.is_active,
        has_auth: !!staff.auth_user_id,
      },
      instructor,
    })
  } catch (error) {
    return internalErrorResponse('Staff me API', error)
  }
}
