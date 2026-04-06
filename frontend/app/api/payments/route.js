import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog, maskSensitiveData } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 決済一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const paymentType = searchParams.get('payment_type')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const memberId = searchParams.get('member_id')
    const storeId = searchParams.get('store_id')

    const offset = (page - 1) * limit

    let query = supabase
      .from('payments')
      .select(`
        *,
        members (
          id,
          name,
          email
        ),
        stores (
          id,
          name
        )
      `, { count: 'exact' })

    if (paymentType) {
      query = query.eq('payment_type', paymentType)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (fromDate) {
      query = query.gte('payment_date', fromDate)
    }

    if (toDate) {
      query = query.lte('payment_date', toDate)
    }

    if (memberId) {
      query = query.eq('member_id', memberId)
    }

    // 店舗フィルター
    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    query = query
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: payments, error, count } = await query

    if (error) {
      return internalErrorResponse('Payments fetch', error)
    }

    return okResponse({
      payments,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return internalErrorResponse('Payments API', error)
  }
}

// POST: 決済登録
export async function POST(request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { member_id, payment_type, amount, payment_date, payment_method, status, description, store_id } = body

    if (!payment_type || !amount || !payment_date) {
      return badRequestResponse('種別、金額、日付は必須です')
    }

    if (!store_id) {
      return badRequestResponse('店舗を選択してください')
    }

    const { data: payment, error } = await supabase
      .from('payments')
      .insert({
        member_id: member_id || null,
        payment_type,
        amount,
        payment_date,
        payment_method,
        status: status || 'completed',
        description,
        store_id
      })
      .select(`
        *,
        members (
          id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      return internalErrorResponse('Payment create', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'payments',
      recordId: payment.id,
      newData: maskSensitiveData(payment),
      request,
    })

    return okResponse({ payment }, 201)
  } catch (error) {
    return internalErrorResponse('Payments POST', error)
  }
}
