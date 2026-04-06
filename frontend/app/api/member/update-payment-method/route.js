import { createAdminClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { verifyMemberToken } from '@/lib/auth/member-token'
import { okResponse, badRequestResponse, unauthorizedResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

/**
 * POST /api/member/update-payment-method
 * 会員の支払い方法（クレジットカード）を更新
 */
export async function POST(request) {
  try {
    const { payment_method_id, member_id } = await request.json()

    let memberId = member_id

    // member_idが提供されていない場合は、従来の認証トークンを使用
    if (!memberId) {
      const authHeader = request.headers.get('authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return unauthorizedResponse('認証が必要です')
      }

      const token = authHeader.split(' ')[1]
      memberId = verifyMemberToken(token)

      if (!memberId) {
        return unauthorizedResponse('無効なトークンです')
      }
    }

    if (!payment_method_id) {
      return badRequestResponse('必要なパラメータが不足しています')
    }

    const supabase = createAdminClient()

    // 会員情報を取得
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, stripe_customer_id, stripe_subscription_id')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員情報が見つかりません')
    }

    if (!member.stripe_customer_id) {
      return badRequestResponse('Stripe顧客情報がありません')
    }

    // PaymentMethodをCustomerに紐付け
    await stripe.paymentMethods.attach(payment_method_id, {
      customer: member.stripe_customer_id,
    })

    // デフォルトの支払い方法として設定
    await stripe.customers.update(member.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    })

    // サブスクリプションがある場合は、そちらのデフォルト支払い方法も更新
    if (member.stripe_subscription_id) {
      await stripe.subscriptions.update(member.stripe_subscription_id, {
        default_payment_method: payment_method_id,
      })
    }

    return okResponse({
      success: true,
      message: '支払い方法を更新しました',
    })
  } catch (error) {
    // Stripeエラーの詳細を返す
    if (error.type === 'StripeCardError') {
      return badRequestResponse(error.message)
    }

    return internalErrorResponse('Update payment method', error)
  }
}
