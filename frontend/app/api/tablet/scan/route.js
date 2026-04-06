import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * POST /api/tablet/scan
 * QRコードスキャン時の会員情報取得
 */
export async function POST(request) {
  try {
    const { qr_token } = await request.json()

    if (!qr_token) {
      return badRequestResponse('QRトークンが指定されていません')
    }

    // UUID形式のバリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(qr_token)) {
      return badRequestResponse('無効なQRコードです')
    }

    const supabase = createAdminClient()

    // QRトークンから会員を検索
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select(`
        id,
        member_number,
        first_name,
        last_name,
        email,
        phone,
        status,
        stripe_customer_id
      `)
      .eq('qr_code_token', qr_token)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員情報が見つかりません。QRコードを確認してください。')
    }

    // 現在の滞在状況を確認（退館していない入館記録）
    const { data: currentVisit } = await supabase
      .from('attendance_logs')
      .select('id, check_in_at, store_id')
      .eq('member_id', member.id)
      .is('check_out_at', null)
      .order('check_in_at', { ascending: false })
      .limit(1)
      .single()

    return okResponse({
      member: {
        ...member,
        name: `${member.last_name} ${member.first_name}`,
      },
      current_visit: currentVisit || null,
    })
  } catch (error) {
    return internalErrorResponse('Tablet scan', error)
  }
}
