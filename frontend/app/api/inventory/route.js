import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 入荷一覧取得
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const storeId = searchParams.get('store_id')
    const productId = searchParams.get('product_id')
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const offset = (page - 1) * limit

    let query = supabase
      .from('inventory_receipts')
      .select(`
        *,
        product:products(id, name, category, price),
        store:stores(id, name),
        received_by:staff!received_by_staff_id(id, name)
      `, { count: 'exact' })

    if (storeId) {
      query = query.eq('store_id', storeId)
    }
    if (productId) {
      query = query.eq('product_id', productId)
    }
    if (fromDate) {
      query = query.gte('received_date', fromDate)
    }
    if (toDate) {
      query = query.lte('received_date', toDate)
    }

    query = query
      .order('received_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: receipts, error, count } = await query

    if (error) throw error

    return okResponse({
      receipts,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return internalErrorResponse('Inventory receipts fetch', error)
  }
}

// POST: 入荷記録作成
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const {
      product_id,
      store_id,
      received_date,
      quantity,
      purchase_price,
      supplier_name,
      invoice_number,
      notes
    } = body

    // バリデーション
    if (!product_id || !store_id || !quantity) {
      return badRequestResponse('商品、店舗、数量は必須です')
    }

    if (quantity <= 0) {
      return badRequestResponse('数量は1以上を指定してください')
    }

    // 商品の存在確認
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('id', product_id)
      .single()

    if (productError || !product) {
      return notFoundResponse('商品が見つかりません')
    }

    // 店舗の存在確認
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', store_id)
      .single()

    if (storeError || !store) {
      return notFoundResponse('店舗が見つかりません')
    }

    // 入荷記録を作成
    const receiptData = {
      product_id,
      store_id,
      received_date: received_date || new Date().toISOString().split('T')[0],
      quantity,
      purchase_price: purchase_price || null,
      supplier_name: supplier_name || null,
      invoice_number: invoice_number || null,
      notes: notes || null,
      received_by_staff_id: staff.id
    }

    const { data: receipt, error: insertError } = await supabase
      .from('inventory_receipts')
      .insert(receiptData)
      .select(`
        *,
        product:products(id, name, category, price),
        store:stores(id, name),
        received_by:staff!received_by_staff_id(id, name)
      `)
      .single()

    if (insertError) {
      throw insertError
    }

    return okResponse({
      receipt,
      success: true,
      message: '入荷を記録しました'
    }, 201)
  } catch (error) {
    return internalErrorResponse('Inventory receipt create', error)
  }
}
