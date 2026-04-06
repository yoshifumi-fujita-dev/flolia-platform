import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, internalErrorResponse } from '@/lib/api-response'

// トリガー種別一覧取得
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('line_notification_triggers')
      .select('*')
      .order('id')

    if (error) {
      return internalErrorResponse('Failed to fetch triggers', error)
    }

    return okResponse(data)
  } catch (error) {
    return internalErrorResponse('LINE notification triggers GET', error)
  }
}
