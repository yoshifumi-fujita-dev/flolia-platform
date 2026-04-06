import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// POST: インストラクターのLINE連携
export async function POST(request) {
  try {
    const body = await request.json()
    const { line_user_id, token } = body

    if (!line_user_id) {
      return badRequestResponse('LINE User IDが必要です')
    }

    if (!token) {
      return badRequestResponse('連携トークンが必要です')
    }

    const supabase = createAdminClient()

    // トークンからインストラクターを検索
    // トークンはインストラクターIDをBase64エンコードしたもの
    let instructorId
    try {
      instructorId = Buffer.from(token, 'base64').toString('utf-8')
    } catch (e) {
      return badRequestResponse('無効な連携トークンです')
    }

    // インストラクターの存在確認
    const { data: instructor, error: fetchError } = await supabase
      .from('instructors')
      .select('id, name, line_user_id')
      .eq('id', instructorId)
      .single()

    if (fetchError || !instructor) {
      return notFoundResponse('インストラクターが見つかりません')
    }

    // 既に別のインストラクターに紐付いているLINE User IDかチェック
    const { data: existingLink } = await supabase
      .from('instructors')
      .select('id, name')
      .eq('line_user_id', line_user_id)
      .neq('id', instructorId)
      .single()

    if (existingLink) {
      return badRequestResponse('このLINEアカウントは既に他のインストラクターに紐付けられています')
    }

    // LINE User IDを更新
    const { error: updateError } = await supabase
      .from('instructors')
      .update({
        line_user_id: line_user_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', instructorId)

    if (updateError) {
      return internalErrorResponse('Instructor LINE link', updateError)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'instructors',
      recordId: instructorId,
      oldData: { line_user_id: instructor.line_user_id },
      newData: { line_user_id: line_user_id },
      request,
    })

    return okResponse({
      success: true,
      message: 'LINE連携が完了しました',
    })
  } catch (error) {
    return internalErrorResponse('Instructor link-line', error)
  }
}
