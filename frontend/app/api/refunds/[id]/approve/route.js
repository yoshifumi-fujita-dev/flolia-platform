import { stripe } from '@/lib/stripe'
import { requireStaffSession } from '@/lib/auth/staff'
import { createAuditLog } from '@/lib/audit'
import { sendRefundCompleted } from '@/lib/resend/client'
import { sendRefundNotification } from '@/lib/line/notifications'
import { okResponse, badRequestResponse, forbiddenResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

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

export async function POST(request, { params }) {
  try {
    const { staff, adminSupabase } = await requireStaffSession()
    const refundId = params.id

    if (!refundId) {
      return badRequestResponse('返金IDが必要です')
    }

    if (!canRefundAction(staff, 'approve')) {
      return forbiddenResponse('返金の承認権限がありません')
    }

    const { data: refund, error: refundError } = await adminSupabase
      .from('refunds')
      .select(`
        *,
        payments (
          id,
          amount,
          status,
          stripe_payment_intent_id,
          stripe_charge_id,
          stripe_invoice_id
        ),
        members (
          id,
          name,
          email,
          line_user_id
        )
      `)
      .eq('id', refundId)
      .single()

    if (refundError || !refund) {
      return notFoundResponse('返金申請が見つかりません')
    }

    if (refund.status !== 'requested') {
      return badRequestResponse('この返金申請は承認できません')
    }

    const payment = refund.payments
    if (!payment) {
      return badRequestResponse('紐づく決済が見つかりません')
    }

    const paymentIntentId = payment.stripe_payment_intent_id || refund.stripe_payment_intent_id
    const chargeId = payment.stripe_charge_id || refund.stripe_charge_id

    if (!paymentIntentId && !chargeId) {
      return badRequestResponse('Stripe決済情報が不足しているため返金できません')
    }

    const refundParams = {
      amount: refund.refund_amount,
      metadata: {
        refund_id: refund.id,
        payment_id: refund.payment_id,
        reason_type: refund.reason_type,
        fee_bearer: refund.fee_bearer,
      },
    }

    if (paymentIntentId) {
      refundParams.payment_intent = paymentIntentId
    } else {
      refundParams.charge = chargeId
    }

    let stripeRefund
    try {
      stripeRefund = await stripe.refunds.create(refundParams)
    } catch (stripeError) {
      await adminSupabase
        .from('refunds')
        .update({
          status: 'failed',
          approved_by: staff.id,
          approved_at: new Date().toISOString(),
          error_message: stripeError.message || 'Stripe返金に失敗しました',
        })
        .eq('id', refund.id)

      return internalErrorResponse('Stripe refund', stripeError)
    }

    const now = new Date().toISOString()
    const paymentStatus = refund.refund_amount >= payment.amount ? 'refunded' : 'partially_refunded'

    const { data: updatedRefund, error: updateError } = await adminSupabase
      .from('refunds')
      .update({
        status: 'processed',
        approved_by: staff.id,
        approved_at: now,
        processed_at: now,
        stripe_refund_id: stripeRefund.id,
        stripe_payment_intent_id: stripeRefund.payment_intent || paymentIntentId,
        stripe_charge_id: stripeRefund.charge || chargeId,
        error_message: null,
      })
      .eq('id', refund.id)
      .select()
      .single()

    if (updateError) {
      return internalErrorResponse('Refund update', updateError)
    }

    await adminSupabase
      .from('payments')
      .update({ status: paymentStatus })
      .eq('id', payment.id)

    await createAuditLog({
      action: 'update',
      tableName: 'refunds',
      recordId: updatedRefund.id,
      newData: updatedRefund,
      request,
      description: `返金承認・実行（payment_id: ${refund.payment_id}）`,
    })

    const member = refund.members
    if (member?.email) {
      try {
        await sendRefundCompleted({
          to: member.email,
          name: member.name || '会員',
          amount: refund.refund_amount,
          refundDate: now,
        })
      } catch (emailError) {
        console.error('Refund email error:', emailError)
      }
    }

    if (member?.line_user_id) {
      try {
        await sendRefundNotification(member.line_user_id, {
          name: member.name || '会員',
          amount: refund.refund_amount,
          refundDate: now,
        })
      } catch (lineError) {
        console.error('Refund LINE error:', lineError)
      }
    }

    return okResponse({ refund: updatedRefund })
  } catch (error) {
    return internalErrorResponse('Refund approve', error)
  }
}
