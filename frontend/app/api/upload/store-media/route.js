import { createAdminClient } from '@/lib/supabase/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { okResponse, badRequestResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

// メディアの種類とファイル名のマッピング（基本名のみ、拡張子は実際のファイルに依存）
const MEDIA_TYPES = {
  'hero': { folder: 'videos', baseName: 'hero', type: 'video' },
  'concept': { folder: 'videos', baseName: 'concept', type: 'video' },
  'cta': { folder: 'videos', baseName: 'cta', type: 'video' },
}

// ギャラリー用フォルダ名
const GALLERY_FOLDER = 'gallery'

export const dynamic = 'force-dynamic'

// MIMEタイプから拡張子を取得
const getExtensionFromMime = (mimeType) => {
  const map = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  return map[mimeType] || 'bin'
}

// NOTE: 認証チェックはミドルウェアで実施済み
export async function POST(request) {
  try {
    const { adminSupabase } = await requireStaffSession()

    const formData = await request.formData()
    const file = formData.get('file')
    const storeSlug = formData.get('store_slug')
    const mediaType = formData.get('media_type')

    // バリデーション
    if (!file) {
      return badRequestResponse('ファイルが必要です')
    }

    if (!mediaType || !MEDIA_TYPES[mediaType]) {
      return badRequestResponse('無効なメディアタイプです')
    }

    const mediaConfig = MEDIA_TYPES[mediaType]
    const isVideo = mediaConfig.type === 'video'

    // ファイル形式チェック
    const allowedTypes = isVideo ? ALLOWED_VIDEO_TYPES : ALLOWED_IMAGE_TYPES
    if (!allowedTypes.includes(file.type)) {
      return badRequestResponse(isVideo
        ? '動画形式が無効です。MP4、WebM、MOVのみ対応しています。'
        : '画像形式が無効です。JPG、PNG、WebPのみ対応しています。'
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // ファイルサイズチェック
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
    if (buffer.byteLength > maxSize) {
      return badRequestResponse(`ファイルサイズが大きすぎます（最大${isVideo ? '100MB' : '10MB'}）`)
    }

    const supabase = adminSupabase

    // ファイルの拡張子を取得
    const extension = getExtensionFromMime(file.type)
    const filename = `${mediaConfig.baseName}.${extension}`

    // ファイルパスを構築
    // storeSlugがある場合: videos/tsujido/hero.mp4
    // storeSlugがない場合: videos/hero.mp4
    const folderPath = storeSlug
      ? `${mediaConfig.folder}/${storeSlug}`
      : mediaConfig.folder
    const filePath = `${folderPath}/${filename}`

    // 同じベース名の既存ファイルを削除（拡張子が異なる可能性）
    const { data: existingFiles } = await supabase.storage
      .from('store-media')
      .list(folderPath, { limit: 100 })

    if (existingFiles) {
      const filesToDelete = existingFiles
        .filter(f => f.name.startsWith(mediaConfig.baseName + '.'))
        .map(f => `${folderPath}/${f.name}`)

      if (filesToDelete.length > 0) {
        await supabase.storage.from('store-media').remove(filesToDelete)
      }
    }

    // Supabaseにアップロード
    const { data, error: uploadError } = await supabase.storage
      .from('store-media')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '86400',
        upsert: true
      })

    if (uploadError) {
      return internalErrorResponse('Store media upload', uploadError)
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabase.storage
      .from('store-media')
      .getPublicUrl(filePath)

    return okResponse({
      success: true,
      url: publicUrl,
      path: filePath,
      mediaType
    })

  } catch (error) {
    return internalErrorResponse('Upload API', error)
  }
}

// メディア一覧取得
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const storeSlug = searchParams.get('store_slug')

    const supabase = createAdminClient()

    // 各メディアタイプの存在確認
    const mediaStatus = {}

    // フォルダごとにファイル一覧を取得してキャッシュ
    const folderContents = {}
    const debugInfo = {}

    for (const [key, config] of Object.entries(MEDIA_TYPES)) {
      const folderPath = storeSlug
        ? `${config.folder}/${storeSlug}`
        : config.folder

      // フォルダの内容をキャッシュから取得、または新規取得
      if (!folderContents[folderPath]) {
        const { data, error } = await supabase.storage
          .from('store-media')
          .list(folderPath, {
            limit: 100
          })

        if (error) {
          console.log(`[store-media] Error listing ${folderPath}:`, error.message)
          debugInfo[folderPath] = { error: error.message }
        } else {
          console.log(`[store-media] Files in ${folderPath}:`, data?.map(f => f.name).join(', ') || 'none')
          debugInfo[folderPath] = { files: data?.map(f => f.name) || [] }
        }

        folderContents[folderPath] = error ? [] : (data || [])
      }

      // ベース名で始まるファイルを検索（拡張子は問わない）
      const files = folderContents[folderPath]
      const matchingFile = files.find(f =>
        f.name.startsWith(config.baseName + '.')
      )

      if (matchingFile) {
        // 実際にアップロードされたファイル名を使用
        const actualFilePath = `${folderPath}/${matchingFile.name}`
        const { data: { publicUrl } } = supabase.storage
          .from('store-media')
          .getPublicUrl(actualFilePath)

        // キャッシュバスター追加（ブラウザキャッシュ回避）
        const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

        mediaStatus[key] = {
          exists: true,
          url: urlWithCacheBust,
          path: actualFilePath,
          type: config.type,
          filename: matchingFile.name
        }
      } else {
        mediaStatus[key] = {
          exists: false,
          type: config.type,
          expectedPath: `${folderPath}/${config.baseName}.*`
        }
      }
    }

    return okResponse({ media: mediaStatus, debug: debugInfo })

  } catch (error) {
    return internalErrorResponse('Get media API', error)
  }
}

// メディア削除
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
      return internalErrorResponse('Store media delete', error)
    }

    return successResponse()

  } catch (error) {
    return internalErrorResponse('Delete API', error)
  }
}
