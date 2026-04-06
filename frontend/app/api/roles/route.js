import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, conflictResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 権限一覧取得
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: roles, error } = await supabase
      .from('roles')
      .select('*')
      .order('sort_order', { ascending: false, nullsFirst: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    return okResponse({ roles })
  } catch (error) {
    return internalErrorResponse('Roles fetch', error)
  }
}

// POST: 権限作成（カスタム権限用）
export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { name, display_name, description, permissions, sort_order } = body

    if (!name || !display_name) {
      return badRequestResponse('権限名と表示名は必須です')
    }

    const { data: role, error } = await supabase
      .from('roles')
      .insert({
        name,
        display_name,
        description,
        permissions: permissions || {},
        sort_order: sort_order ?? 999,
        is_system: false,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return conflictResponse('この権限名は既に使用されています')
      }
      throw error
    }

    return okResponse({ role }, 201)
  } catch (error) {
    return internalErrorResponse('Role create', error)
  }
}
