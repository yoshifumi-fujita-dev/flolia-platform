import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: LINE User IDからインストラクター情報を取得
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('line_user_id')

    if (!lineUserId) {
      return badRequestResponse('LINE User IDが必要です')
    }

    const supabase = createAdminClient()

    // LINE User IDでインストラクターを検索
    const { data: instructor, error } = await supabase
      .from('instructors')
      .select('id, name, name_kana, image_url, qr_code_token, is_active')
      .eq('line_user_id', lineUserId)
      .single()

    if (error || !instructor) {
      return notFoundResponse('インストラクターが見つかりません')
    }

    if (!instructor.is_active) {
      return forbiddenResponse('このアカウントは無効です')
    }

    return okResponse({
      instructor: {
        id: instructor.id,
        name: instructor.name,
        name_kana: instructor.name_kana,
        image_url: instructor.image_url,
        qr_code_token: instructor.qr_code_token,
      },
      linked: true,
    })
  } catch (error) {
    return internalErrorResponse('Instructor me', error)
  }
}
