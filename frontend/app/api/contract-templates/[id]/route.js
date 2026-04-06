import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { okResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 契約書テンプレート詳細取得
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return notFoundResponse('契約書テンプレートが見つかりません')
    }

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('Contract template', error)
  }
}

// PUT: 契約書テンプレート更新
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const { name, content, is_active } = body

    // 既存データを取得
    const { data: existingData, error: fetchError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingData) {
      return notFoundResponse('契約書テンプレートが見つかりません')
    }

    // 更新データを構築
    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (content !== undefined) updateData.content = content
    if (is_active !== undefined) updateData.is_active = is_active
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('contract_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return internalErrorResponse('Contract template update', error)
    }

    // 監査ログ
    await createAuditLog({
      action: 'update',
      tableName: 'contract_templates',
      recordId: id,
      oldData: existingData,
      newData: data,
      request,
    })

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('Contract template update', error)
  }
}

// DELETE: 契約書テンプレート削除（論理削除）
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // 既存データを取得
    const { data: existingData, error: fetchError } = await supabase
      .from('contract_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingData) {
      return notFoundResponse('契約書テンプレートが見つかりません')
    }

    // 使用中の契約があるか確認
    const { count } = await supabase
      .from('staff_contracts')
      .select('id', { count: 'exact', head: true })
      .eq('contract_template_id', id)

    if (count > 0) {
      // 使用中の場合は論理削除（無効化）
      const { data, error } = await supabase
        .from('contract_templates')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        return internalErrorResponse('Contract template deactivate', error)
      }

      // 監査ログ
      await createAuditLog({
        action: 'update',
        tableName: 'contract_templates',
        recordId: id,
        oldData: existingData,
        newData: data,
        request,
      })

      return okResponse({
        message: '契約書テンプレートを無効化しました（使用中の契約があるため）',
        deactivated: true,
      })
    }

    // 使用中でない場合は物理削除
    const { error } = await supabase
      .from('contract_templates')
      .delete()
      .eq('id', id)

    if (error) {
      return internalErrorResponse('Contract template delete', error)
    }

    // 監査ログ
    await createAuditLog({
      action: 'delete',
      tableName: 'contract_templates',
      recordId: id,
      oldData: existingData,
      request,
    })

    return okResponse({
      message: '契約書テンプレートを削除しました',
      deleted: true,
    })
  } catch (error) {
    return internalErrorResponse('Contract template delete', error)
  }
}
