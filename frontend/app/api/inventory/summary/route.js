import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 店舗別在庫サマリー取得
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const storeId = searchParams.get('store_id')
    const productId = searchParams.get('product_id')
    const category = searchParams.get('category')

    if (!storeId) {
      return badRequestResponse('店舗IDは必須です')
    }

    // RPC関数を使用して在庫情報を取得
    const { data: inventory, error } = await supabase
      .rpc('get_store_inventory', {
        p_store_id: storeId,
        p_product_id: productId || null
      })

    if (error) throw error

    // カテゴリでフィルタリング（RPC関数で対応できない場合）
    let filteredInventory = inventory
    if (category) {
      filteredInventory = inventory.filter(item => item.category === category)
    }

    // サマリー情報を計算
    const summary = {
      total_products: filteredInventory.length,
      total_stock: filteredInventory.reduce((sum, item) => sum + (item.current_stock || 0), 0),
      out_of_stock_count: filteredInventory.filter(item => item.current_stock <= 0).length,
      low_stock_count: filteredInventory.filter(item => item.current_stock > 0 && item.current_stock <= 5).length
    }

    return okResponse({
      inventory: filteredInventory,
      summary
    })
  } catch (error) {
    return internalErrorResponse('Inventory summary fetch', error)
  }
}
