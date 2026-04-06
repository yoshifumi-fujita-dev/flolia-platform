import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 法務ページ取得（スラッグ指定）
export async function GET(request, { params }) {
  try {
    const { slug } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('legal_pages')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('ページが見つかりません')
      }
      return internalErrorResponse('Legal page fetch', error)
    }

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('Legal page', error)
  }
}

// PUT: 法務ページ更新
export async function PUT(request, { params }) {
  try {
    const { slug } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { title, content } = body

    if (!title || !content) {
      return badRequestResponse('必須項目が入力されていません')
    }

    // スタッフIDをヘッダーから取得
    const staffId = request.headers.get('x-staff-id')

    const { data, error } = await supabase
      .from('legal_pages')
      .update({
        title,
        content,
        updated_at: new Date().toISOString(),
        updated_by: staffId || null,
      })
      .eq('slug', slug)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Legal page update', error)
    }

    // 監査ログ
    await createAuditLog({
      action: 'update',
      tableName: 'legal_pages',
      recordId: data.id,
      newData: data,
      request,
    })

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('Legal page update', error)
  }
}
