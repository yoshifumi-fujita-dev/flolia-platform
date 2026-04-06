import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 入荷記録詳細取得
export async function GET(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    const { data: receipt, error } = await supabase
      .from('inventory_receipts')
      .select(`
        *,
        product:products(id, name, category, price),
        store:stores(id, name),
        received_by:staff!received_by_staff_id(id, name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return notFoundResponse('入荷記録が見つかりません')
      }
      throw error
    }

    return okResponse({ receipt })
  } catch (error) {
    return internalErrorResponse('Inventory receipt fetch', error)
  }
}

// PUT: 入荷記録更新
export async function PUT(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params
    const body = await request.json()

    const {
      received_date,
      quantity,
      purchase_price,
      supplier_name,
      invoice_number,
      notes
    } = body

    // バリデーション
    if (quantity !== undefined && quantity <= 0) {
      return badRequestResponse('数量は1以上を指定してください')
    }

    // 既存レコードの存在確認
    const { data: existing, error: existingError } = await supabase
      .from('inventory_receipts')
      .select('id')
      .eq('id', id)
      .single()

    if (existingError || !existing) {
      return notFoundResponse('入荷記録が見つかりません')
    }

    // 更新データを構築
    const updateData = {}
    if (received_date !== undefined) updateData.received_date = received_date
    if (quantity !== undefined) updateData.quantity = quantity
    if (purchase_price !== undefined) updateData.purchase_price = purchase_price
    if (supplier_name !== undefined) updateData.supplier_name = supplier_name
    if (invoice_number !== undefined) updateData.invoice_number = invoice_number
    if (notes !== undefined) updateData.notes = notes

    const { data: receipt, error: updateError } = await supabase
      .from('inventory_receipts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        product:products(id, name, category, price),
        store:stores(id, name),
        received_by:staff!received_by_staff_id(id, name)
      `)
      .single()

    if (updateError) throw updateError

    return okResponse({
      receipt,
      success: true,
      message: '入荷記録を更新しました'
    })
  } catch (error) {
    return internalErrorResponse('Inventory receipt update', error)
  }
}

// DELETE: 入荷記録削除
export async function DELETE(request, { params }) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { id } = await params

    // 既存レコードの存在確認
    const { data: existing, error: existingError } = await supabase
      .from('inventory_receipts')
      .select('id, product:products(name), store:stores(name), quantity')
      .eq('id', id)
      .single()

    if (existingError || !existing) {
      return notFoundResponse('入荷記録が見つかりません')
    }

    const { error: deleteError } = await supabase
      .from('inventory_receipts')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Inventory receipt delete', error)
  }
}
