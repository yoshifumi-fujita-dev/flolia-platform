import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

// GET: インストラクター一覧取得
// NOTE: 認証チェックはミドルウェアで実施済み
export async function GET(request) {
  try {
    const { adminSupabase } = await requireStaffSession()
    const supabase = adminSupabase
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const storeId = searchParams.get('store_id')
    const includeInactive = searchParams.get('include_inactive') === 'true'
    const linkedOnly = searchParams.get('linked_only') === 'true'

    const offset = (page - 1) * limit

    let query = supabase
      .from('instructors')
      .select('*', { count: 'exact' })

    if (linkedOnly) {
      const { data: staffLinks, error: staffError } = await supabase
        .from('staff')
        .select('instructor_id')
        .eq('is_instructor', true)
        .not('instructor_id', 'is', null)

      if (staffError) throw staffError

      const instructorIds = Array.from(
        new Set((staffLinks || []).map((link) => link.instructor_id).filter(Boolean))
      )

      if (instructorIds.length === 0) {
        return okResponse({
          instructors: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
        })
      }

      query = query.in('id', instructorIds)
    }

    // 検索
    if (search) {
      query = query.or(`name.ilike.%${search}%,name_kana.ilike.%${search}%,bio.ilike.%${search}%`)
    }

    // 店舗フィルター（配列に含まれるか）
    if (storeId) {
      query = query.contains('store_ids', [storeId])
    }

    // アクティブフィルター
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    query = query
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: instructors, error, count } = await query

    if (error) throw error

    return okResponse({
      instructors,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return internalErrorResponse('Instructors fetch', error)
  }
}

// POST: インストラクター作成
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase, staff } = await requireStaffSession()
    const supabase = adminSupabase
    const body = await request.json()

    const {
      store_ids,
      name,
      name_kana,
      bio,
      comment,
      image_url,
      handwritten_message_image_url,
      class_rate,
      free_rate,
      substitute_rate,
      sort_order,
      incentive_threshold,
      incentive_amount,
      incentive_type,
      gender,
      blood_type,
      prefecture,
    } = body

    if (!name) {
      return badRequestResponse('氏名は必須です')
    }

    const { data: instructor, error } = await supabase
      .from('instructors')
      .insert({
        store_ids: store_ids || [],
        name,
        name_kana: name_kana || null,
        bio: bio || null,
        comment: comment || null,
        image_url: image_url || null,
        handwritten_message_image_url: handwritten_message_image_url || null,
        class_rate: class_rate || 0,
        free_rate: free_rate || 0,
        substitute_rate: substitute_rate || 0,
        sort_order: sort_order || 0,
        incentive_threshold: incentive_threshold || 0,
        incentive_amount: incentive_amount || 0,
        incentive_type: incentive_type || 'per_person',
        gender: gender || null,
        blood_type: blood_type || null,
        prefecture: prefecture || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'instructors',
      recordId: instructor.id,
      newData: instructor,
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    // キャッシュ無効化
    invalidateCaches([CACHE_TAGS.INSTRUCTORS])

    return okResponse({ instructor }, 201)
  } catch (error) {
    return internalErrorResponse('Instructor create', error)
  }
}
