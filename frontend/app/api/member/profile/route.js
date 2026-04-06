import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

// GET: LINE user IDから会員情報を取得
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lineUserId = searchParams.get('line_user_id')

    if (!lineUserId) {
      return badRequestResponse('LINE user IDが必要です')
    }

    const supabase = createAdminClient()

    // LINE user IDから会員情報を取得
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('line_user_id', lineUserId)
      .single()

    if (error || !member) {
      return notFoundResponse('LINE連携されていません。スタッフにお問い合わせください。')
    }

    return okResponse({ member })
  } catch (error) {
    return internalErrorResponse('Member profile fetch', error)
  }
}
