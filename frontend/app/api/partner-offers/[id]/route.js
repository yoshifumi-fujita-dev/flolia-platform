import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, unauthorizedResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// PUT: 提携特典更新
// NOTE: 認証チェックはミドルウェアで実施済み
export async function PUT(request, { params }) {
  try {
    const session = await requireStaffSession()
    if (session?.error) {
      return unauthorizedResponse('認証が必要です')
    }
    const { adminSupabase } = session
    const { id } = params
    const body = await request.json()
    const {
      name,
      address,
      url,
      report_email,
      benefit,
      is_active = true,
      sort_order = 0,
      usage_limit_type = 'none',
      usage_limit_count = null,
    } = body

    if (!name || !benefit) {
      return badRequestResponse('店舗名と特典内容は必須です')
    }

    const supabase = adminSupabase

    const { data: offer, error } = await supabase
      .from('partner_offers')
      .update({
        name,
        address: address || null,
        url: url || null,
        report_email: report_email || null,
        benefit,
        is_active,
        sort_order,
        usage_limit_type,
        usage_limit_count,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return okResponse({ offer })
  } catch (error) {
    return internalErrorResponse('Update partner offer', error)
  }
}

// DELETE: 提携特典削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request, { params }) {
  try {
    const session = await requireStaffSession()
    if (session?.error) {
      return unauthorizedResponse('認証が必要です')
    }
    const { adminSupabase } = session
    const { id } = params

    const supabase = adminSupabase

    const { error } = await supabase
      .from('partner_offers')
      .delete()
      .eq('id', id)

    if (error) throw error

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Delete partner offer', error)
  }
}
