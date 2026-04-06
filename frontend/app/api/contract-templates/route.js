import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 契約書テンプレート一覧取得
export async function GET(request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    // クエリパラメータ
    const employmentType = searchParams.get('employment_type')
    const activeOnly = searchParams.get('active_only') !== 'false'

    let query = supabase
      .from('contract_templates')
      .select('*')
      .order('employment_type')
      .order('version', { ascending: false })

    if (employmentType) {
      query = query.eq('employment_type', employmentType)
    }

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      return internalErrorResponse('Contract templates fetch', error)
    }

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('Contract templates', error)
  }
}

// POST: 契約書テンプレート作成
export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { name, employment_type, document_type, content } = body

    if (!name || !employment_type || !content) {
      return badRequestResponse('必須項目が入力されていません')
    }

    // 同じ雇用形態・文書種別の最新バージョンを取得
    let versionQuery = supabase
      .from('contract_templates')
      .select('version')
      .eq('employment_type', employment_type)
      .order('version', { ascending: false })
      .limit(1)

    if (document_type) {
      versionQuery = versionQuery.eq('document_type', document_type)
    }

    const { data: latestVersion } = await versionQuery.single()

    const newVersion = (latestVersion?.version || 0) + 1

    // 新しいテンプレートを作成
    const insertData = {
      name,
      employment_type,
      version: newVersion,
      content,
      is_active: true,
    }
    if (document_type) {
      insertData.document_type = document_type
    }

    const { data, error } = await supabase
      .from('contract_templates')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Contract template create', error)
    }

    // 監査ログ
    await createAuditLog({
      action: 'insert',
      tableName: 'contract_templates',
      recordId: data.id,
      newData: data,
      request,
    })

    return okResponse(data, 201)
  } catch (error) {
    return internalErrorResponse('Contract template create', error)
  }
}
