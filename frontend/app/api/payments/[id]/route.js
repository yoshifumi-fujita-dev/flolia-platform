import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog, maskSensitiveData } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// PUT: 決済更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params
    const body = await request.json()

    const { member_id, payment_type, amount, payment_date, payment_method, status, description } =
      body

    // 更新前のデータを取得（監査ログ用）
    const { data: oldPayment } = await supabase.from('payments').select('*').eq('id', id).single()

    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        member_id: member_id || null,
        payment_type,
        amount,
        payment_date,
        payment_method,
        status,
        description,
      })
      .eq('id', id)
      .select(
        `
        *,
        members (
          id,
          name,
          email
        )
      `
      )
      .single()

    if (error) {
      return internalErrorResponse('Payment update', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'payments',
      recordId: id,
      oldData: maskSensitiveData(oldPayment),
      newData: maskSensitiveData(payment),
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    return okResponse({ payment })
  } catch (error) {
    return internalErrorResponse('Payment PUT', error)
  }
}

// DELETE: 決済削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    // 削除前のデータを取得（監査ログ用）
    const { data: oldPayment } = await supabase.from('payments').select('*').eq('id', id).single()

    const { error } = await supabase.from('payments').delete().eq('id', id)

    if (error) {
      return internalErrorResponse('Payment delete', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'payments',
      recordId: id,
      oldData: maskSensitiveData(oldPayment),
      adminUser: staff ? { id: staff.id, email: staff.email, name: staff.name } : null,
      request,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Payment DELETE', error)
  }
}
