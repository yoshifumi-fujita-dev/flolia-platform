import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog, maskSensitiveData } from '@/lib/audit'
import { invalidateCaches, CACHE_TAGS } from '@/lib/cache'
import { okResponse, badRequestResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

async function createLinkedInstructor(supabase, staffMember) {
  const { data: instructor, error } = await supabase
    .from('instructors')
    .insert({
      store_ids: staffMember.assigned_store_ids || [],
      name: staffMember.name,
      name_kana: staffMember.name_kana || null,
      bio: staffMember.instructor_bio || null,
      comment: null,
      image_url: staffMember.instructor_image_url || null,
      handwritten_message_image_url: null,
      class_rate: 0,
      free_rate: 0,
      substitute_rate: 0,
      sort_order: 0,
      incentive_threshold: 0,
      incentive_amount: 0,
      incentive_type: 'per_person',
      gender: null,
      blood_type: null,
      prefecture: null,
      is_active: true,
    })
    .select()
    .single()

  if (error) throw error
  return instructor
}

// GET: 従業員詳細取得
export async function GET(request, { params }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // スタッフ情報を取得（インストラクター情報も含む）
    const { data: staff, error } = await supabase
      .from('staff')
      .select('*, roles(id, name, display_name, permissions)')
      .eq('id', id)
      .single()

    if (error) throw error

    if (!staff) {
      return notFoundResponse('従業員が見つかりません')
    }

    // インストラクター情報を取得
    let instructor = null
    if (staff.instructor_id) {
      const { data: instructorData } = await supabase
        .from('instructors')
        .select('*')
        .eq('id', staff.instructor_id)
        .single()
      instructor = instructorData
    }

    return okResponse({ staff, instructor })
  } catch (error) {
    return internalErrorResponse('Staff fetch', error)
  }
}

// PUT: 従業員更新
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      email,
      name,
      name_kana,
      phone,
      role_id,
      assigned_store_ids,
      is_instructor,
      instructor_bio,
      instructor_image_url,
      employment_type,
      hire_date,
      is_active,
      attendance_tracking,
      profile_image_url,
      // インストラクター情報（統合用）
      instructor_data,
    } = body

    // 更新前のデータを取得（監査ログ用）
    const { data: oldStaff } = await supabase.from('staff').select('*').eq('id', id).single()

    // メールアドレスの重複チェック（自分以外）
    if (email) {
      const { data: existing } = await supabase
        .from('staff')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single()

      if (existing) {
        return badRequestResponse('このメールアドレスは既に登録されています')
      }
    }

    const updateData = {
      updated_at: new Date().toISOString(),
    }

    if (email !== undefined) updateData.email = email
    if (name !== undefined) updateData.name = name
    if (name_kana !== undefined) updateData.name_kana = name_kana || null
    if (phone !== undefined) updateData.phone = phone || null
    if (role_id !== undefined) updateData.role_id = role_id || null
    if (assigned_store_ids !== undefined) updateData.assigned_store_ids = assigned_store_ids || []
    if (is_instructor !== undefined) updateData.is_instructor = is_instructor
    if (instructor_bio !== undefined) updateData.instructor_bio = instructor_bio || null
    if (instructor_image_url !== undefined) updateData.instructor_image_url = instructor_image_url || null
    if (employment_type !== undefined) updateData.employment_type = employment_type
    if (hire_date !== undefined) updateData.hire_date = hire_date || null
    if (is_active !== undefined) updateData.is_active = is_active
    if (attendance_tracking !== undefined) updateData.attendance_tracking = attendance_tracking
    if (profile_image_url !== undefined) updateData.profile_image_url = profile_image_url || null

    const { data: staff, error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', id)
      .select('*, roles(id, name, display_name)')
      .single()

    if (error) throw error

    let finalStaff = staff
    let updatedInstructor = null

    if (staff.is_instructor) {
      if (!staff.instructor_id) {
        // 新規インストラクターリンク作成
        try {
          const instructor = await createLinkedInstructor(supabase, staff)
          await supabase
            .from('staff')
            .update({ instructor_id: instructor.id })
            .eq('id', staff.id)
          finalStaff = { ...staff, instructor_id: instructor.id }
          updatedInstructor = instructor
        } catch (instructorError) {
          return internalErrorResponse('Instructor link', instructorError)
        }
      } else {
        // 既存インストラクターを有効化
        await supabase
          .from('instructors')
          .update({ is_active: true })
          .eq('id', staff.instructor_id)
      }

      // インストラクター情報の更新（instructor_dataが渡された場合）
      if (instructor_data && staff.instructor_id) {
        const instructorUpdateData = {
          updated_at: new Date().toISOString(),
        }

        // インストラクター情報フィールドを更新
        if (instructor_data.store_ids !== undefined) instructorUpdateData.store_ids = instructor_data.store_ids || []
        if (instructor_data.name !== undefined) instructorUpdateData.name = instructor_data.name
        if (instructor_data.name_kana !== undefined) instructorUpdateData.name_kana = instructor_data.name_kana || null
        if (instructor_data.bio !== undefined) instructorUpdateData.bio = instructor_data.bio || null
        if (instructor_data.comment !== undefined) instructorUpdateData.comment = instructor_data.comment || null
        if (instructor_data.image_url !== undefined) instructorUpdateData.image_url = instructor_data.image_url || null
        if (instructor_data.handwritten_message_image_url !== undefined) instructorUpdateData.handwritten_message_image_url = instructor_data.handwritten_message_image_url || null
        if (instructor_data.class_rate !== undefined) instructorUpdateData.class_rate = instructor_data.class_rate ?? 0
        if (instructor_data.free_rate !== undefined) instructorUpdateData.free_rate = instructor_data.free_rate ?? 0
        if (instructor_data.substitute_rate !== undefined) instructorUpdateData.substitute_rate = instructor_data.substitute_rate ?? 0
        if (instructor_data.sort_order !== undefined) instructorUpdateData.sort_order = instructor_data.sort_order ?? 0
        if (instructor_data.incentive_threshold !== undefined) instructorUpdateData.incentive_threshold = instructor_data.incentive_threshold ?? 0
        if (instructor_data.incentive_amount !== undefined) instructorUpdateData.incentive_amount = instructor_data.incentive_amount ?? 0
        if (instructor_data.incentive_type !== undefined) instructorUpdateData.incentive_type = instructor_data.incentive_type || 'per_person'
        if (instructor_data.gender !== undefined) instructorUpdateData.gender = instructor_data.gender || null
        if (instructor_data.blood_type !== undefined) instructorUpdateData.blood_type = instructor_data.blood_type || null
        if (instructor_data.prefecture !== undefined) instructorUpdateData.prefecture = instructor_data.prefecture || null
        if (instructor_data.is_active !== undefined) instructorUpdateData.is_active = instructor_data.is_active ?? true

        const { data: instructorResult, error: instructorError } = await supabase
          .from('instructors')
          .update(instructorUpdateData)
          .eq('id', staff.instructor_id)
          .select()
          .single()

        if (instructorError) {
          return internalErrorResponse('Instructor update', instructorError)
        }

        updatedInstructor = instructorResult

        // インストラクターキャッシュを無効化
        invalidateCaches([CACHE_TAGS.INSTRUCTORS])
      }
    } else if (oldStaff?.instructor_id) {
      // インストラクターフラグがOFFになった場合、インストラクターを非公開に
      await supabase
        .from('instructors')
        .update({ is_active: false })
        .eq('id', oldStaff.instructor_id)

      invalidateCaches([CACHE_TAGS.INSTRUCTORS])
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'update',
      tableName: 'staff',
      recordId: id,
      oldData: maskSensitiveData(oldStaff),
      newData: maskSensitiveData(finalStaff),
      request,
    })

    return okResponse({ staff: finalStaff, instructor: updatedInstructor })
  } catch (error) {
    return internalErrorResponse('Staff update', error)
  }
}

// DELETE: 従業員削除
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    // 削除前のデータを取得（監査ログ用）
    const { data: oldStaff } = await supabase.from('staff').select('*').eq('id', id).single()

    // 論理削除（is_activeをfalseに）
    const { error } = await supabase
      .from('staff')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    // 監査ログ記録
    await createAuditLog({
      action: 'delete',
      tableName: 'staff',
      recordId: id,
      oldData: maskSensitiveData(oldStaff),
      request,
      description: `従業員を無効化（${oldStaff?.name}）`,
    })

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Staff delete', error)
  }
}
