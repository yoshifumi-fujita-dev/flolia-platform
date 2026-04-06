import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import sharp from 'sharp'
import { okResponse, badRequestResponse, unauthorizedResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase, error: authError } = await requireStaffSession()

    if (authError) {
      return unauthorizedResponse('認証が必要です')
    }

    const formData = await request.formData()
    const file = formData.get('file')

    // バリデーション
    if (!file) {
      return badRequestResponse('ファイルが必要です')
    }

    // ファイル形式チェック
    if (!ALLOWED_TYPES.includes(file.type)) {
      return badRequestResponse('画像形式が無効です。JPG、PNG、WebPのみ対応しています。')
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // ファイルサイズチェック
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return badRequestResponse('ファイルサイズが大きすぎます（最大5MB）')
    }

    // 画像を最適化（300x300にリサイズ）
    let optimizedBuffer
    try {
      optimizedBuffer = await sharp(buffer)
        .resize(300, 300, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 85 })
        .toBuffer()
    } catch (err) {
      return badRequestResponse('画像の処理に失敗しました')
    }

    // Supabaseにアップロード
    const supabase = adminSupabase
    const fileName = `staff-${Date.now()}.webp`
    const filePath = `staff/${fileName}`

    const { data, error: uploadError } = await supabase.storage
      .from('staff-images')
      .upload(filePath, optimizedBuffer, {
        contentType: 'image/webp',
        cacheControl: '86400',
        upsert: true
      })

    if (uploadError) {
      return internalErrorResponse('Staff image upload', uploadError)
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('staff-images')
      .getPublicUrl(filePath)

    return okResponse({
      success: true,
      url: publicUrl,
      path: filePath
    })

  } catch (error) {
    return internalErrorResponse('Upload API', error)
  }
}

// 画像削除
// NOTE: 認証チェックはミドルウェアで実施済み
export async function DELETE(request) {
  try {
    const { adminSupabase, error: authError } = await requireStaffSession()

    if (authError) {
      return unauthorizedResponse('認証が必要です')
    }

    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return badRequestResponse('画像パスが必要です')
    }

    const supabase = adminSupabase

    const { error } = await supabase.storage
      .from('staff-images')
      .remove([path])

    if (error) {
      return internalErrorResponse('Staff image delete', error)
    }

    return successResponse()

  } catch (error) {
    return internalErrorResponse('Delete API', error)
  }
}
