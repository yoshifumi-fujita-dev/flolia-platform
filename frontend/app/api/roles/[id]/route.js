import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 権限詳細取得
export async function GET(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    const { data: role, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('権限が見つかりません')
      }
      throw error
    }

    return okResponse({ role })
  } catch (error) {
    return internalErrorResponse('Role fetch', error)
  }
}

// PUT: 権限更新
export async function PUT(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()

    const { display_name, description, permissions, sort_order, name } = body

    const updateData = {}

    if (name !== undefined) {
      updateData.name = name
    }
    if (display_name !== undefined) {
      updateData.display_name = display_name
    }
    if (description !== undefined) {
      updateData.description = description
    }
    if (permissions !== undefined) {
      updateData.permissions = permissions
    }
    if (sort_order !== undefined) {
      updateData.sort_order = sort_order
    }

    updateData.updated_at = new Date().toISOString()

    const { data: role, error } = await supabase
      .from('roles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('権限が見つかりません')
      }
      throw error
    }

    return okResponse({ role })
  } catch (error) {
    return internalErrorResponse('Role update', error)
  }
}

// DELETE: 権限削除（adminロール以外）
export async function DELETE(request, { params }) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    // 管理者ロールかチェック
    const { data: role, error: checkError } = await supabase
      .from('roles')
      .select('name')
      .eq('id', id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return notFoundResponse('権限が見つかりません')
      }
      throw checkError
    }

    // adminロールは削除不可
    if (role.name === 'admin') {
      return badRequestResponse('管理者ロールは削除できません')
    }

    // 使用中かチェック（有効なスタッフのみ）
    const { count } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', id)
      .eq('is_active', true)

    if (count > 0) {
      return badRequestResponse('この権限は使用中のため削除できません')
    }

    // 無効なスタッフのrole_idをnullに設定
    await supabase
      .from('staff')
      .update({ role_id: null })
      .eq('role_id', id)
      .eq('is_active', false)

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id)

    if (error) {
      // 外部キー制約違反の場合
      if (error.code === '23503') {
        return badRequestResponse('この権限は他のデータで使用されているため削除できません')
      }
      throw error
    }

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Role delete', error)
  }
}
