import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { successResponse, internalErrorResponse } from '@/lib/api-response'

export async function POST(request) {
  try {
    const supabase = await createClient()

    // 現在のユーザーを取得（ログアウト前）
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // ログアウトの監査ログを記録
      await createAuditLog({
        action: 'logout',
        tableName: 'auth',
        request,
        description: `${user.email}がログアウトしました`,
      })
    }

    // ログアウト実行
    const { error } = await supabase.auth.signOut()

    if (error) {
      return internalErrorResponse('Logout', error)
    }

    return successResponse()

  } catch (error) {
    return internalErrorResponse('Logout', error)
  }
}
