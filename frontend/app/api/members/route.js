import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog, maskSensitiveData } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, conflictResponse, internalErrorResponse } from '@/lib/api-response'

// GET: 会員一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const membershipType = searchParams.get('membership_type')
    const search = searchParams.get('search')
    const storeId = searchParams.get('store_id')
    const lineConnected = searchParams.get('line_connected')

    const offset = (page - 1) * limit

    let query = supabase
      .from('members')
      .select('*, stores(id, name, code)', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }

    if (membershipType) {
      query = query.eq('membership_type', membershipType)
    }

    if (storeId) {
      query = query.eq('store_id', storeId)
    }

    // LINE連携フィルター
    if (lineConnected === 'true') {
      query = query.not('line_user_id', 'is', null)
    } else if (lineConnected === 'false') {
      query = query.is('line_user_id', null)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: members, error, count } = await query

    if (error) {
      return internalErrorResponse('Members fetch', error)
    }

    return okResponse({
      members,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return internalErrorResponse('Members API', error)
  }
}

// POST: 会員登録
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const { name, email, phone, membership_type, status, joined_at, notes, store_id } = body

    if (!name || !email || !joined_at) {
      return badRequestResponse('氏名、メールアドレス、入会日は必須です')
    }

    const { data: member, error } = await supabase
      .from('members')
      .insert({
        name,
        email,
        phone,
        membership_type: membership_type || 'trial',
        status: status || 'active',
        joined_at,
        notes,
        store_id: store_id || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return conflictResponse('このメールアドレスは既に登録されています')
      }
      return internalErrorResponse('Member create', error)
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'members',
      recordId: member.id,
      newData: maskSensitiveData(member),
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    return okResponse({ member }, 201)
  } catch (error) {
    return internalErrorResponse('Members POST', error)
  }
}
