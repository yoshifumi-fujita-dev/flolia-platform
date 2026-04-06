import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const dynamic = 'force-dynamic'

// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase } = await requireStaffSession()

    const formData = await request.formData()
    const file = formData.get('file')
    const storeSlug = formData.get('store_slug')
    const facilityId = formData.get('facility_id')

    if (!file) {
      return badRequestResponse('ファイルが必要です')
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return badRequestResponse('画像形式が無効です。JPG、PNG、WebPのみ対応しています。')
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return badRequestResponse('ファイルサイズが大きすぎます（最大10MB）')
    }

    const supabase = adminSupabase

    // ファイル名を生成（タイムスタンプ + 元のファイル名）
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const filename = `facility_${facilityId || timestamp}.${ext}`

    // ファイルパスを構築
    const folderPath = storeSlug
      ? `facilities/${storeSlug}`
      : 'facilities'
    const filePath = `${folderPath}/${filename}`

    // Supabaseにアップロード
    const { data, error: uploadError } = await supabase.storage
      .from('store-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '86400',
        upsert: true
      })

    if (uploadError) {
      if (uploadError.message?.includes('not found') || uploadError.statusCode === '404') {
        return internalErrorResponse('Facility image upload - bucket not found', uploadError)
      }
      return internalErrorResponse('Facility image upload', uploadError)
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('store-media')
      .getPublicUrl(filePath)

    return okResponse({
      success: true,
      url: publicUrl,
      path: filePath
    })

  } catch (error) {
    return internalErrorResponse('Facility image upload', error)
  }
}
