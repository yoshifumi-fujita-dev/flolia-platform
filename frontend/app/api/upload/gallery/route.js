import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const GALLERY_FOLDER = 'gallery'

export const dynamic = 'force-dynamic'

// MIMEタイプから拡張子を取得
const getExtensionFromMime = (mimeType) => {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  return map[mimeType] || 'bin'
}

// ギャラリー画像アップロード
// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase } = await requireStaffSession()

    const formData = await request.formData()
    const file = formData.get('file')
    const storeSlug = formData.get('store_slug')

    // バリデーション
    if (!file) {
      return badRequestResponse('ファイルが必要です')
    }

    if (!storeSlug) {
      return badRequestResponse('店舗スラッグが必要です')
    }

    // ファイル形式チェック
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return badRequestResponse('画像形式が無効です。JPG、PNG、WebPのみ対応しています。')
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // ファイルサイズチェック
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      return badRequestResponse('ファイルサイズが大きすぎます（最大10MB）')
    }

    const supabase = adminSupabase

    // ファイル名を生成（タイムスタンプ + ランダム文字列）
    const extension = getExtensionFromMime(file.type)
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const filename = `${timestamp}_${randomStr}.${extension}`

    // ファイルパスを構築: gallery/tsujido/xxx.jpg
    const folderPath = `${GALLERY_FOLDER}/${storeSlug}`
    const filePath = `${folderPath}/${filename}`

    // Supabaseにアップロード
    const { data, error: uploadError } = await supabase.storage
      .from('store-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '86400',
        upsert: false
      })

    if (uploadError) {
      if (uploadError.message?.includes('not found') || uploadError.statusCode === '404') {
        return internalErrorResponse('Gallery upload - bucket not found', uploadError)
      }
      return internalErrorResponse('Gallery upload', uploadError)
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('store-media')
      .getPublicUrl(filePath)

    return okResponse({
      success: true,
      url: publicUrl,
      path: filePath,
      filename
    })

  } catch (error) {
    return internalErrorResponse('Gallery upload API', error)
  }
}

// ギャラリー画像一覧取得
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeSlug = searchParams.get('store_slug')

    if (!storeSlug) {
      return badRequestResponse('店舗スラッグが必要です')
    }

    const supabase = createAdminClient()

    const folderPath = `${GALLERY_FOLDER}/${storeSlug}`

    const { data: files, error } = await supabase.storage
      .from('store-media')
      .list(folderPath, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'asc' }
      })

    if (error) {
      return okResponse({ images: [] })
    }

    // 画像ファイルのみフィルタリング
    const imageFiles = (files || []).filter(f =>
      f.name.match(/\.(jpg|jpeg|png|webp)$/i)
    )

    // 公開URLを付与
    const images = imageFiles.map(f => {
      const filePath = `${folderPath}/${f.name}`
      const { data: { publicUrl } } = supabase.storage
        .from('store-media')
        .getPublicUrl(filePath)

      return {
        name: f.name,
        path: filePath,
        url: `${publicUrl}?t=${Date.now()}`,
        createdAt: f.created_at
      }
    })

    return okResponse({ images })

  } catch (error) {
    return internalErrorResponse('Gallery list API', error)
  }
}

// ギャラリー画像削除
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return badRequestResponse('ファイルパスが必要です')
    }

    const supabase = createAdminClient()

    const { error } = await supabase.storage
      .from('store-media')
      .remove([path])

    if (error) {
      return internalErrorResponse('Gallery delete', error)
    }

    return successResponse()

  } catch (error) {
    return internalErrorResponse('Gallery delete API', error)
  }
}
