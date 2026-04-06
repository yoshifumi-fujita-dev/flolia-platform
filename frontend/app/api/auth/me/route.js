import { createClient, createAdminClient } from '@/lib/supabase/server'
import { okResponse, unauthorizedResponse, forbiddenResponse, internalErrorResponse, supabaseErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: 現在のログインユーザー情報と権限を取得
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return unauthorizedResponse()

    const adminSupabase = createAdminClient()

    console.log('Auth me: user.id =', user.id, 'email =', user.email)

    let { data: staff, error: staffError } = await adminSupabase
      .from('staff')
      .select('*, roles(id, name, display_name, permissions)')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    console.log('Auth me: staff =', staff, 'staffError =', staffError)

    if (!staff) return forbiddenResponse('スタッフ情報が見つかりません')

    return okResponse({ staff, permissions: staff.roles?.permissions || {} })
  } catch (error) {
    return internalErrorResponse('Auth me GET', error)
  }
}

// PUT: ログインユーザーのプロフィール更新
export async function PUT(request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return unauthorizedResponse()

    const adminSupabase = createAdminClient()
    const body = await request.json()
    const { name, name_kana, phone, instructor_bio } = body

    const { data: existingStaff } = await adminSupabase
      .from('staff')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!existingStaff) return forbiddenResponse('スタッフ情報が見つかりません')

    const updateData = {}
    if (name !== undefined) updateData.name = name
    if (name_kana !== undefined) updateData.name_kana = name_kana
    if (phone !== undefined) updateData.phone = phone
    if (instructor_bio !== undefined) updateData.instructor_bio = instructor_bio

    const { data: updatedStaff, error: updateError } = await adminSupabase
      .from('staff')
      .update(updateData)
      .eq('id', existingStaff.id)
      .select('*, roles(id, name, display_name, permissions)')
      .single()

    if (updateError) return supabaseErrorResponse('Staff update', updateError, 'プロフィールの更新に失敗しました')

    return okResponse({ staff: updatedStaff, permissions: updatedStaff.roles?.permissions || {} })
  } catch (error) {
    return internalErrorResponse('Auth me PUT', error)
  }
}
