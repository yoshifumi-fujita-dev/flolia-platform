import { createAdminClient } from '@/lib/supabase/server'
import { createAuditLog, maskSensitiveData } from '@/lib/audit'
import { requireStaffSession } from '@/lib/auth/staff'
import { Resend } from 'resend'
import crypto from 'crypto'
import { okResponse, badRequestResponse, unauthorizedResponse, internalErrorResponse } from '@/lib/api-response'

const resend = new Resend(process.env.RESEND_API_KEY)

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

// GET: 従業員一覧取得
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
    const roleId = searchParams.get('role_id')
    const isInstructor = searchParams.get('is_instructor')
    const includeInactive = searchParams.get('include_inactive') === 'true'

    const offset = (page - 1) * limit

    let query = supabase
      .from('staff')
      .select('*, roles(id, name, display_name)', { count: 'exact' })

    // 検索
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,name_kana.ilike.%${search}%`)
    }

    // 店舗フィルター
    if (storeId) {
      query = query.contains('assigned_store_ids', [storeId])
    }

    // 権限フィルター
    if (roleId) {
      query = query.eq('role_id', roleId)
    }

    // インストラクターフィルター
    if (isInstructor === 'true') {
      query = query.eq('is_instructor', true)
    }

    // アクティブフィルター
    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    query = query
      .order('employee_number', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data: staff, error, count } = await query

    if (error) throw error

    // インストラクター情報を取得（インストラクターフィルターがONの場合）
    let staffWithInstructors = staff
    if (isInstructor === 'true' && staff?.length > 0) {
      const instructorIds = staff
        .filter(s => s.instructor_id)
        .map(s => s.instructor_id)

      if (instructorIds.length > 0) {
        const { data: instructors } = await supabase
          .from('instructors')
          .select('*')
          .in('id', instructorIds)

        const instructorMap = new Map(instructors?.map(i => [i.id, i]) || [])

        staffWithInstructors = staff.map(s => ({
          ...s,
          instructor: s.instructor_id ? instructorMap.get(s.instructor_id) || null : null
        }))
      }
    }

    return okResponse({
      staff: staffWithInstructors,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    return internalErrorResponse('Staff fetch', error)
  }
}

// POST: 従業員作成
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase, staff, error: authError } = await requireStaffSession()
    if (authError || !staff) {
      return unauthorizedResponse('認証が必要です')
    }
    const supabase = adminSupabase
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
      attendance_tracking,
      profile_image_url,
    } = body

    if (!email || !name) {
      return badRequestResponse('メールアドレスと氏名は必須です')
    }

    // メールアドレスの重複チェック
    const { data: existing } = await supabase
      .from('staff')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      return badRequestResponse('このメールアドレスは既に登録されています')
    }

    // スタッフを作成
    const { data: createdStaff, error } = await supabase
      .from('staff')
      .insert({
        email,
        name,
        name_kana: name_kana || null,
        phone: phone || null,
        role_id: role_id || null,
        assigned_store_ids: assigned_store_ids || [],
        is_instructor: is_instructor || false,
        instructor_bio: instructor_bio || null,
        instructor_image_url: instructor_image_url || null,
        employment_type: employment_type || 'contractor',
        hire_date: hire_date || null,
        is_active: true,
        onboarding_status: 'invited',
        attendance_tracking: attendance_tracking !== false, // デフォルトtrue
        profile_image_url: profile_image_url || null,
      })
      .select('*, roles(id, name, display_name)')
      .single()

    if (error) {
      throw error
    }

    let staffWithInstructor = createdStaff
    if (createdStaff.is_instructor) {
      try {
        const instructor = await createLinkedInstructor(supabase, createdStaff)
        await supabase
          .from('staff')
          .update({ instructor_id: instructor.id })
          .eq('id', createdStaff.id)

        staffWithInstructor = { ...createdStaff, instructor_id: instructor.id }
      } catch (instructorError) {
        return internalErrorResponse('Instructor link', instructorError)
      }
    }

    // 招待トークンを生成
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7日間有効

    // 招待レコードを作成
    const { error: inviteError } = await supabase
      .from('staff_invitations')
      .insert({
        staff_id: createdStaff.id,
        token,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        sent_at: new Date().toISOString(),
        sent_count: 1,
      })

    if (inviteError) {
      console.error('Invitation create error:', inviteError)
      // 招待作成失敗しても、スタッフ作成は成功とする
    }

    // 招待メールを送信
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/staff/onboarding/${token}`

    try {
      await resend.emails.send({
        from: 'FLOLIA <noreply@flolia.jp>',
        to: email,
        subject: '【FLOLIA】従業員登録のご案内',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">FLOLIA</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">従業員登録のご案内</p>
            </div>

            <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
              <p>${name} 様</p>

              <p>この度はFLOLIAへのご入社、誠にありがとうございます。</p>

              <p>下記のリンクより従業員登録を完了してください。<br>
              登録では契約書の確認・署名、パスワードの設定を行います。</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}"
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold;">
                  従業員登録を開始する
                </a>
              </div>

              <p style="color: #666; font-size: 14px;">
                このリンクの有効期限は<strong>7日間</strong>です。<br>
                期限が切れた場合は、管理者に再送信を依頼してください。
              </p>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">

              <p style="color: #999; font-size: 12px;">
                このメールに心当たりがない場合は、このメールを無視してください。<br>
                ご不明点がございましたら、管理者までお問い合わせください。
              </p>
            </div>

            <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
              <p>&copy; FLOLIA All Rights Reserved.</p>
            </div>
          </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // メール送信失敗してもスタッフ作成は成功とする
    }

    // 監査ログ記録
    await createAuditLog({
      action: 'create',
      tableName: 'staff',
      recordId: createdStaff.id,
      newData: maskSensitiveData(createdStaff),
      adminUser: {
        id: staff.id,
        role_id: staff.role_id,
      },
      request,
    })

    return okResponse({ staff: staffWithInstructor }, 201)
  } catch (error) {
    return internalErrorResponse('Staff create', error)
  }
}
