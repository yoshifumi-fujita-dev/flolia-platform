import { createClient, createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, unauthorizedResponse, forbiddenResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// システム設定取得
export async function GET(request) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (key) {
      // 特定のキーを取得
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('key', key)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return okResponse({ setting: data })
    }

    // 全設定を取得
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key')

    if (error) throw error

    return okResponse({ settings: data })
  } catch (error) {
    return internalErrorResponse('System settings fetch', error)
  }
}

// システム設定更新
export async function PUT(request) {
  try {
    // 認証チェック
    const authSupabase = await createClient()
    const { data: { user }, error: authError } = await authSupabase.auth.getUser()
    if (authError || !user) {
      return unauthorizedResponse('認証が必要です')
    }

    const supabase = createAdminClient()

    // スタッフ情報を取得して権限チェック
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('id, role_id, roles(name, permissions)')
      .eq('auth_user_id', user.id)
      .single()

    if (staffError || !staff) {
      return forbiddenResponse('スタッフ情報が見つかりません')
    }

    // settings権限チェック（権限管理で「設定」が許可されているロールのみ変更可能）
    const settingsPermission = staff.roles?.permissions?.settings?.edit
    if (!settingsPermission) {
      return forbiddenResponse('設定の変更権限がありません')
    }

    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return badRequestResponse('キーは必須です')
    }

    const { data, error } = await supabase
      .from('system_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: staff.id
      }, { onConflict: 'key' })
      .select()
      .single()

    if (error) throw error

    return okResponse({ setting: data })
  } catch (error) {
    return internalErrorResponse('System settings update', error)
  }
}
