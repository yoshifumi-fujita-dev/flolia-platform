import { createAdminClient } from '@/lib/supabase/server'
import { okResponse, badRequestResponse, notFoundResponse, successResponse, internalErrorResponse } from '@/lib/api-response'

// 会員写真をアップロード
export async function POST(request, { params }) {
  const { id } = await params
  const supabase = createAdminClient()

  try {
    const formData = await request.formData()
    const file = formData.get('photo')

    if (!file) {
      return badRequestResponse('写真ファイルが必要です')
    }

    // ファイルタイプのチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return badRequestResponse('JPEG、PNG、WebP形式のみ対応しています')
    }

    // ファイルサイズのチェック (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return badRequestResponse('ファイルサイズは5MB以下にしてください')
    }

    // 会員存在確認
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id')
      .eq('id', id)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    // 拡張子を取得
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const fileName = `${id}.${ext}`

    // 既存の写真を削除（上書き）
    await supabase.storage
      .from('member-photos')
      .remove([`${id}.jpg`, `${id}.png`, `${id}.webp`])

    // Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('member-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      return internalErrorResponse('Upload', uploadError)
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from('member-photos')
      .getPublicUrl(fileName)

    // membersテーブルを更新
    const { error: updateError } = await supabase
      .from('members')
      .update({ photo_url: urlData.publicUrl })
      .eq('id', id)

    if (updateError) {
      return internalErrorResponse('Member update', updateError)
    }

    return okResponse({
      success: true,
      photo_url: urlData.publicUrl,
    })
  } catch (error) {
    return internalErrorResponse('Photo upload', error)
  }
}

// 会員写真を取得（署名付きURL）
export async function GET(request, { params }) {
  const { id } = await params
  const supabase = createAdminClient()

  try {
    // 会員情報を取得
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('photo_url')
      .eq('id', id)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    if (!member.photo_url) {
      return notFoundResponse('写真が登録されていません')
    }

    // 署名付きURLを生成（1時間有効）
    const fileName = member.photo_url.split('/').pop()
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('member-photos')
      .createSignedUrl(fileName, 3600)

    if (signedUrlError) {
      return internalErrorResponse('URL generation', signedUrlError)
    }

    return okResponse({
      photo_url: signedUrlData.signedUrl,
    })
  } catch (error) {
    return internalErrorResponse('Photo get', error)
  }
}

// 会員写真を削除
export async function DELETE(request, { params }) {
  const { id } = await params
  const supabase = createAdminClient()

  try {
    // 会員情報を取得
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('photo_url')
      .eq('id', id)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    if (!member.photo_url) {
      return successResponse()
    }

    // Storageから削除
    const fileName = member.photo_url.split('/').pop()
    await supabase.storage
      .from('member-photos')
      .remove([fileName])

    // membersテーブルを更新
    await supabase
      .from('members')
      .update({ photo_url: null })
      .eq('id', id)

    return successResponse()
  } catch (error) {
    return internalErrorResponse('Photo delete', error)
  }
}
