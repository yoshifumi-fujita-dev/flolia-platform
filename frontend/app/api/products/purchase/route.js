import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { format } from 'date-fns'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// POST: 商品購入（月末まとめ決済のため記録のみ）
export async function POST(request) {
  try {
    const supabase = await createAdminClient()
    const body = await request.json()

    const {
      member_id,
      store_id,
      product_id,
      quantity = 1,
      staff_id,
    } = body

    // バリデーション
    if (!member_id || !store_id || !product_id) {
      return badRequestResponse('会員ID、店舗ID、商品IDは必須です')
    }

    if (quantity < 1) {
      return badRequestResponse('数量は1以上を指定してください')
    }

    // 会員情報を取得
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, email, stripe_customer_id')
      .eq('id', member_id)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    // カード情報が登録されているかチェック（月末決済時に必要）
    if (!member.stripe_customer_id) {
      return badRequestResponse('この会員は決済情報が登録されていません')
    }

    // 商品情報を取得
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      return notFoundResponse('商品が見つかりません')
    }

    // 在庫チェック（RPC関数を使用）
    const { data: currentStock, error: stockError } = await supabase
      .rpc('check_product_stock', {
        p_store_id: store_id,
        p_product_id: product_id
      })

    if (stockError) {
      console.error('Stock check error:', stockError)
      // RPC関数がまだ存在しない場合はスキップ（移行期間中）
    } else if (currentStock !== null && currentStock < quantity) {
      return badRequestResponse(`在庫が不足しています（現在庫: ${currentStock}）`)
    }

    const totalAmount = product.price * quantity
    const settlementMonth = format(new Date(), 'yyyy-MM')

    // 購入レコードを作成（unsettled状態 = 月末決済待ち）
    const { data: purchase, error: purchaseError } = await supabase
      .from('product_purchases')
      .insert({
        member_id,
        store_id,
        product_id,
        product_name: product.name,
        product_price: product.price,
        quantity,
        total_amount: totalAmount,
        status: 'unsettled',
        settlement_month: settlementMonth,
        staff_id: staff_id || null,
        instructor_id: product.instructor_id || null,  // インストラクター商品の場合
      })
      .select()
      .single()

    if (purchaseError) {
      console.error('Purchase record create error:', purchaseError)
      throw purchaseError
    }

    // 在庫は入荷記録と購入記録から自動計算されるため、手動更新は不要

    // 監査ログ
    await createAuditLog({
      action: 'create',
      tableName: 'product_purchases',
      recordId: purchase.id,
      newData: purchase,
      request,
    })

    return okResponse({
      success: true,
      purchase: {
        id: purchase.id,
        product_name: product.name,
        quantity,
        total_amount: totalAmount,
        status: 'unsettled',
        settlement_month: settlementMonth,
      },
      message: '購入を記録しました。月末にまとめて決済されます。',
    })
  } catch (error) {
    return internalErrorResponse('Purchase', error)
  }
}

// GET: 購入履歴取得
export async function GET(request) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)

    const memberId = searchParams.get('member_id')
    const storeId = searchParams.get('store_id')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('product_purchases')
      .select(`
        *,
        member:member_id(id, name, email),
        store:store_id(id, name),
        product:product_id(id, name, category),
        staff:staff_id(id, name)
      `, { count: 'exact' })

    if (memberId) {
      query = query.eq('member_id', memberId)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query
      .order('purchased_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return okResponse({
      purchases: data,
      pagination: {
        total: count,
        limit,
        offset,
      },
    })
  } catch (error) {
    return internalErrorResponse('Purchases fetch', error)
  }
}
