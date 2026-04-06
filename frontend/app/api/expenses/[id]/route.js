import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog, maskSensitiveData } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { isAdmin, canManageExpenses } from '@/lib/auth/permissions'
import { okResponse, badRequestResponse, notFoundResponse, forbiddenResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 経費申請詳細取得
export async function GET(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    const { data: expense, error } = await supabase
      .from('expense_requests')
      .select(`
        *,
        staff:staff_id(id, name, email),
        category:category_id(id, name, account_code, account_name, tax_category),
        reviewer:reviewed_by(id, name),
        store:store_id(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('経費申請が見つかりません')
      }
      throw error
    }

    // 権限チェック（自分の申請か、管理者・マネージャーか）
    if (!canManageExpenses(staff) && expense.staff_id !== staff.id) {
      return forbiddenResponse('この経費申請を閲覧する権限がありません')
    }

    return okResponse({ expense })
  } catch (error) {
    return internalErrorResponse('Expense fetch', error)
  }
}

// PATCH: 経費申請更新（承認/却下）
export async function PATCH(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params
    const body = await request.json()

    // 既存データを取得
    const { data: existing, error: fetchError } = await supabase
      .from('expense_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return notFoundResponse('経費申請が見つかりません')
      }
      throw fetchError
    }

    // 権限チェック
    const canManage = canManageExpenses(staff)
    const isOwner = existing.staff_id === staff.id

    // 自分の申請の編集（ステータスがpendingの場合のみ）
    if (isOwner && existing.status === 'pending' && !body.status) {
      const {
        expense_date,
        amount,
        category_id,
        vendor_name,
        description,
        receipt_image_url,
        store_id,
      } = body

      const updateData = {}
      if (expense_date !== undefined) updateData.expense_date = expense_date
      if (amount !== undefined) updateData.amount = amount
      if (category_id !== undefined) updateData.category_id = category_id
      if (vendor_name !== undefined) updateData.vendor_name = vendor_name
      if (description !== undefined) updateData.description = description
      if (receipt_image_url !== undefined) updateData.receipt_image_url = receipt_image_url
      if (store_id !== undefined) updateData.store_id = store_id

      const { data: expense, error } = await supabase
        .from('expense_requests')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          staff:staff_id(id, name, email),
          category:category_id(id, name, account_code, account_name),
          reviewer:reviewed_by(id, name),
          store:store_id(id, name)
        `)
        .single()

      if (error) throw error

      await createAuditLog({
        action: 'update',
        tableName: 'expense_requests',
        recordId: id,
        oldData: maskSensitiveData(existing),
        newData: maskSensitiveData(expense),
        adminUser: {
          id: staff.id,
          role_id: staff.role_id,
        },
        request,
      })

      return okResponse({ expense })
    }

    // 承認/却下（管理者・マネージャーのみ）
    if (canManage && body.status) {
      const { status, rejection_reason } = body

      if (!['approved', 'rejected'].includes(status)) {
        return badRequestResponse('無効なステータスです')
      }

      if (status === 'rejected' && !rejection_reason) {
        return badRequestResponse('却下理由を入力してください')
      }

      const updateData = {
        status,
        reviewed_by: staff.id,
        reviewed_at: new Date().toISOString(),
      }

      if (status === 'rejected') {
        updateData.rejection_reason = rejection_reason
      }

      const { data: expense, error } = await supabase
        .from('expense_requests')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          staff:staff_id(id, name, email),
          category:category_id(id, name, account_code, account_name),
          reviewer:reviewed_by(id, name),
          store:store_id(id, name)
        `)
        .single()

      if (error) throw error

      await createAuditLog({
        action: 'update',
        tableName: 'expense_requests',
        recordId: id,
        oldData: maskSensitiveData(existing),
        newData: maskSensitiveData(expense),
        adminUser: {
          id: staff.id,
          role_id: staff.role_id,
        },
        request,
      })

      return okResponse({ expense })
    }

    return forbiddenResponse('この操作を行う権限がありません')
  } catch (error) {
    return internalErrorResponse('Expense update', error)
  }
}

// DELETE: 経費申請削除（本人のみ、pendingの場合のみ）
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    // 既存データを取得
    const { data: existing, error: fetchError } = await supabase
      .from('expense_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return notFoundResponse('経費申請が見つかりません')
      }
      throw fetchError
    }

    // 権限チェック
    const canAdmin = isAdmin(staff)
    const isOwner = existing.staff_id === staff.id

    // 本人の場合、pendingのみ削除可能
    if (isOwner && existing.status !== 'pending' && !canAdmin) {
      return badRequestResponse('承認済み・却下済みの申請は削除できません')
    }

    // 本人または管理者のみ削除可能
    if (!isOwner && !canAdmin) {
      return forbiddenResponse('この経費申請を削除する権限がありません')
    }

    const { error } = await supabase
      .from('expense_requests')
      .delete()
      .eq('id', id)

    if (error) throw error

    await createAuditLog({
      action: 'delete',
      tableName: 'expense_requests',
      recordId: id,
      oldData: maskSensitiveData(existing),
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Expense delete', error)
  }
}
