import { requireStaffSession } from '@/lib/auth/staff'
import { createAuditLog } from '@/lib/audit'
import { okResponse, badRequestResponse, forbiddenResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

function parseNumber(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function getPermissions(staff) {
  const permissions = staff?.roles?.permissions
  if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
    return permissions
  }
  return {}
}

function isAdminStaff(staff) {
  return (
    staff?.roles?.name === 'admin' ||
    staff?.roles?.name === 'Super Admin' ||
    staff?.roles?.display_name === '管理者' ||
    staff?.roles?.display_name === 'システム管理者'
  )
}

function canRefundAction(staff, action) {
  if (isAdminStaff(staff)) return true
  const permissions = getPermissions(staff)
  return permissions?.refunds?.[action] === true
}

function normalizeSettingValue(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (error) {
      return value
    }
  }
  return value
}

async function fetchRefundFeeSettings(supabase) {
  const { data: settings } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['refund_fee_type', 'refund_fee_value'])

  const map = {}
  for (const s of settings || []) {
    map[s.key] = normalizeSettingValue(s.value)
  }

  const feeType = map.refund_fee_type || 'percent'
  const feeValue = map.refund_fee_value !== null && map.refund_fee_value !== undefined
    ? Number(map.refund_fee_value)
    : 0

  return {
    feeType: feeType === 'fixed' ? 'fixed' : 'percent',
    feeValue: Number.isFinite(feeValue) ? feeValue : 0,
  }
}

// GET: 返金申請一覧
export async function GET(request) {
  try {
    const { staff, adminSupabase } = await requireStaffSession()
    if (!canRefundAction(staff, 'view')) {
      return forbiddenResponse('返金申請の閲覧権限がありません')
    }
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const paymentId = searchParams.get('payment_id')
    const memberId = searchParams.get('member_id')
    const storeId = searchParams.get('store_id')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = (page - 1) * limit

    let query = adminSupabase
      .from('refunds')
      .select(`
        *,
        payments (
          id,
          amount,
          payment_type,
          payment_date,
          status,
          stripe_payment_intent_id,
          stripe_charge_id
        ),
        members (
          id,
          name,
          email
        ),
        stores (
          id,
          name
        ),
        requested_staff:staff!refunds_requested_by_fkey (
          id,
          name,
          email
        ),
        approved_staff:staff!refunds_approved_by_fkey (
          id,
          name,
          email
        )
      `, { count: 'exact' })

    if (status) query = query.eq('status', status)
    if (paymentId) query = query.eq('payment_id', paymentId)
    if (memberId) query = query.eq('member_id', memberId)
    if (storeId) query = query.eq('store_id', storeId)

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: refunds, error, count } = await query

    if (error) {
      return internalErrorResponse('Refunds fetch', error)
    }

    return okResponse({
      refunds,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    return internalErrorResponse('Refunds API', error)
  }
}

// POST: 返金申請作成
export async function POST(request) {
  try {
    const { staff, adminSupabase } = await requireStaffSession()
    if (!canRefundAction(staff, 'create')) {
      return forbiddenResponse('返金申請の作成権限がありません')
    }
    const body = await request.json()

    const paymentId = body.payment_id
    const requestedAmount = parseNumber(body.requested_amount)
    const reasonType = body.reason_type
    const reasonText = body.reason_text || null
    const feeBearer = body.fee_bearer

    if (!paymentId || !requestedAmount || requestedAmount <= 0) {
      return badRequestResponse('決済IDと返金金額は必須です')
    }

    if (!['customer', 'company'].includes(reasonType)) {
      return badRequestResponse('返金理由区分が不正です')
    }

    if (!['customer', 'company'].includes(feeBearer)) {
      return badRequestResponse('手数料負担区分が不正です')
    }

    const { data: payment, error: paymentError } = await adminSupabase
      .from('payments')
      .select('id, member_id, store_id, amount, status, stripe_payment_intent_id, stripe_charge_id, stripe_invoice_id')
      .eq('id', paymentId)
      .single()

    if (paymentError || !payment) {
      return notFoundResponse('決済が見つかりません')
    }

    if (!['completed'].includes(payment.status)) {
      return badRequestResponse('返金可能な決済ではありません')
    }

    if (requestedAmount > payment.amount) {
      return badRequestResponse('返金額が決済金額を超えています')
    }

    const { data: existing } = await adminSupabase
      .from('refunds')
      .select('id')
      .eq('payment_id', paymentId)
      .maybeSingle()

    if (existing) {
      return badRequestResponse('この決済には既に返金申請があります')
    }

    const { feeType, feeValue } = await fetchRefundFeeSettings(adminSupabase)
    let feeAmount = 0

    if (feeBearer === 'customer' && feeValue > 0) {
      if (feeType === 'fixed') {
        feeAmount = Math.floor(feeValue)
      } else {
        feeAmount = Math.floor((requestedAmount * feeValue) / 100)
      }
    }

    if (feeAmount < 0) feeAmount = 0

    const refundAmount = feeBearer === 'customer'
      ? requestedAmount - feeAmount
      : requestedAmount

    if (refundAmount <= 0) {
      return badRequestResponse('返金額が不正です')
    }

    if (!payment.stripe_payment_intent_id && !payment.stripe_charge_id) {
      return badRequestResponse('Stripe決済情報が不足しているため返金できません')
    }

    const { data: refund, error: refundError } = await adminSupabase
      .from('refunds')
      .insert({
        payment_id: paymentId,
        member_id: payment.member_id,
        store_id: payment.store_id,
        requested_amount: requestedAmount,
        refund_amount: refundAmount,
        fee_amount: feeAmount,
        fee_bearer: feeBearer,
        reason_type: reasonType,
        reason_text: reasonText,
        status: 'requested',
        requested_by: staff.id,
        stripe_payment_intent_id: payment.stripe_payment_intent_id,
        stripe_charge_id: payment.stripe_charge_id,
      })
      .select()
      .single()

    if (refundError) {
      return internalErrorResponse('Refund request create', refundError)
    }

    await createAuditLog({
      action: 'create',
      tableName: 'refunds',
      recordId: refund.id,
      newData: refund,
      request,
      description: `返金申請を作成（payment_id: ${paymentId}）`,
    })

    return okResponse({ refund }, 201)
  } catch (error) {
    return internalErrorResponse('Refund request', error)
  }
}
