import { NextResponse } from 'next/server'
import { requireStaffSession } from '@/lib/auth/staff'
import { badRequestResponse, unauthorizedResponse, notFoundResponse, internalErrorResponse } from '@/lib/api-response'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { readFile } from 'fs/promises'
import path from 'path'
import { generateQRCodeDataURL } from '@/lib/qrcode'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// カタカナ→ローマ字変換テーブル
const KATAKANA_ROMAJI = {
  'ア': 'A', 'イ': 'I', 'ウ': 'U', 'エ': 'E', 'オ': 'O',
  'カ': 'KA', 'キ': 'KI', 'ク': 'KU', 'ケ': 'KE', 'コ': 'KO',
  'サ': 'SA', 'シ': 'SHI', 'ス': 'SU', 'セ': 'SE', 'ソ': 'SO',
  'タ': 'TA', 'チ': 'CHI', 'ツ': 'TSU', 'テ': 'TE', 'ト': 'TO',
  'ナ': 'NA', 'ニ': 'NI', 'ヌ': 'NU', 'ネ': 'NE', 'ノ': 'NO',
  'ハ': 'HA', 'ヒ': 'HI', 'フ': 'FU', 'ヘ': 'HE', 'ホ': 'HO',
  'マ': 'MA', 'ミ': 'MI', 'ム': 'MU', 'メ': 'ME', 'モ': 'MO',
  'ヤ': 'YA', 'ユ': 'YU', 'ヨ': 'YO',
  'ラ': 'RA', 'リ': 'RI', 'ル': 'RU', 'レ': 'RE', 'ロ': 'RO',
  'ワ': 'WA', 'ヲ': 'WO', 'ン': 'N',
  'ガ': 'GA', 'ギ': 'GI', 'グ': 'GU', 'ゲ': 'GE', 'ゴ': 'GO',
  'ザ': 'ZA', 'ジ': 'JI', 'ズ': 'ZU', 'ゼ': 'ZE', 'ゾ': 'ZO',
  'ダ': 'DA', 'ヂ': 'DI', 'ヅ': 'DU', 'デ': 'DE', 'ド': 'DO',
  'バ': 'BA', 'ビ': 'BI', 'ブ': 'BU', 'ベ': 'BE', 'ボ': 'BO',
  'パ': 'PA', 'ピ': 'PI', 'プ': 'PU', 'ペ': 'PE', 'ポ': 'PO',
  'キャ': 'KYA', 'キュ': 'KYU', 'キョ': 'KYO',
  'シャ': 'SHA', 'シュ': 'SHU', 'ショ': 'SHO',
  'チャ': 'CHA', 'チュ': 'CHU', 'チョ': 'CHO',
  'ニャ': 'NYA', 'ニュ': 'NYU', 'ニョ': 'NYO',
  'ヒャ': 'HYA', 'ヒュ': 'HYU', 'ヒョ': 'HYO',
  'ミャ': 'MYA', 'ミュ': 'MYU', 'ミョ': 'MYO',
  'リャ': 'RYA', 'リュ': 'RYU', 'リョ': 'RYO',
  'ギャ': 'GYA', 'ギュ': 'GYU', 'ギョ': 'GYO',
  'ジャ': 'JA', 'ジュ': 'JU', 'ジョ': 'JO',
  'ビャ': 'BYA', 'ビュ': 'BYU', 'ビョ': 'BYO',
  'ピャ': 'PYA', 'ピュ': 'PYU', 'ピョ': 'PYO',
  'ファ': 'FA', 'フィ': 'FI', 'フェ': 'FE', 'フォ': 'FO',
  'ティ': 'TI', 'ディ': 'DI', 'デュ': 'DU',
  'ッ': '', // 促音（次の子音を重ねる処理は別途）
  'ー': '', // 長音
}

// ひらがな→カタカナ変換
function hiraganaToKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) + 0x60)
  )
}

// カタカナをローマ字に変換
function kanaToRomaji(kana) {
  if (!kana) return ''

  // 既にローマ字のみの場合はそのまま返す
  if (/^[a-zA-Z\s]+$/.test(kana)) {
    return kana.toUpperCase()
  }

  // ひらがなをカタカナに変換
  let katakana = hiraganaToKatakana(kana)

  let result = ''
  let i = 0

  while (i < katakana.length) {
    // 2文字の拗音を先にチェック
    if (i + 1 < katakana.length) {
      const twoChar = katakana.substring(i, i + 2)
      if (KATAKANA_ROMAJI[twoChar]) {
        result += KATAKANA_ROMAJI[twoChar]
        i += 2
        continue
      }
    }

    // 1文字をチェック
    const oneChar = katakana[i]
    if (KATAKANA_ROMAJI[oneChar] !== undefined) {
      result += KATAKANA_ROMAJI[oneChar]
    } else if (oneChar === ' ' || oneChar === '　') {
      result += ' '
    }
    i++
  }

  return result.toUpperCase()
}

// カードサイズ (クレジットカードサイズ: 85.6mm × 54mm)
const CARD_WIDTH_MM = 85.6
const CARD_HEIGHT_MM = 54
const MM_TO_PT = 2.83465 // 1mm = 2.83465pt

const CARD_WIDTH = CARD_WIDTH_MM * MM_TO_PT
const CARD_HEIGHT = CARD_HEIGHT_MM * MM_TO_PT

// GET: 会員証PDFを生成
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('member_id')

    if (!memberId) {
      return badRequestResponse('会員IDが指定されていません')
    }

    const { adminSupabase, error: sessionError } = await requireStaffSession()
    if (sessionError === 'unauthenticated') {
      return unauthorizedResponse('認証が必要です')
    }

    const supabase = adminSupabase

    // 会員情報を取得
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, name, last_name_kana, first_name_kana, member_number, qr_code_token, photo_url')
      .eq('id', memberId)
      .single()

    if (memberError || !member) {
      return notFoundResponse('会員が見つかりません')
    }

    if (!member.qr_code_token) {
      return badRequestResponse('QRコードトークンが設定されていません')
    }

    // PDFを生成
    const pdfDoc = await PDFDocument.create()

    // カードサイズのページを作成（1枚のみ）
    const page = pdfDoc.addPage([CARD_WIDTH, CARD_HEIGHT])

    // フォントを埋め込み
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // QRコード画像を生成（DataURLからbase64を抽出してPNGを埋め込む）
    const qrContent = `flolia://member/${member.qr_code_token}`
    const qrDataUrl = await generateQRCodeDataURL(qrContent, { width: 200, margin: 1 })
    const qrBase64 = qrDataUrl.replace(/^data:image\/png;base64,/, '')
    const qrBuffer = Buffer.from(qrBase64, 'base64')
    const qrImage = await pdfDoc.embedPng(qrBuffer)

    // ロゴ画像を読み込み（存在しない場合はスキップ）
    let logoImage = null
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png')
      const logoBuffer = await readFile(logoPath)
      logoImage = await pdfDoc.embedPng(logoBuffer)
    } catch (error) {
      console.warn('Failed to load logo image:', error)
    }

    // 会員写真を取得（存在する場合のみ）
    let memberPhotoImage = null
    if (member.photo_url) {
      try {
        // photo_urlからファイル名を抽出
        const fileName = member.photo_url.split('/').pop()

        // Supabase Storageから署名付きURLを取得
        const storageClient = await createClient()
        const { data: signedUrlData, error: signedUrlError } = await storageClient.storage
          .from('member-photos')
          .createSignedUrl(fileName, 60) // 60秒有効

        if (!signedUrlError && signedUrlData?.signedUrl) {
          // 写真をダウンロード
          const photoResponse = await fetch(signedUrlData.signedUrl)
          if (photoResponse.ok) {
            const photoBuffer = await photoResponse.arrayBuffer()
            const photoUint8Array = new Uint8Array(photoBuffer)

            // 拡張子に応じて埋め込み
            if (fileName.endsWith('.png')) {
              memberPhotoImage = await pdfDoc.embedPng(photoUint8Array)
            } else {
              memberPhotoImage = await pdfDoc.embedJpg(photoUint8Array)
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load member photo:', error)
      }
    }

    // カード描画位置（左下が原点）
    const pos = { x: 0, y: 0 }

    {
      // カード背景（角丸風に見せるための枠）
      page.drawRectangle({
        x: pos.x,
        y: pos.y,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderColor: rgb(0.486, 0.231, 0.929), // violet-600
        borderWidth: 2,
        color: rgb(1, 1, 1),
      })

      // ヘッダー部分（紫の帯）
      page.drawRectangle({
        x: pos.x,
        y: pos.y + CARD_HEIGHT - 25,
        width: CARD_WIDTH,
        height: 25,
        color: rgb(0.486, 0.231, 0.929), // violet-600
      })

      // FLOLIAロゴ（画像があれば画像、なければテキスト）
      if (logoImage) {
        const logoHeight = 16
        const logoWidth = (logoImage.width / logoImage.height) * logoHeight
        page.drawImage(logoImage, {
          x: pos.x + 8,
          y: pos.y + CARD_HEIGHT - 21,
          width: logoWidth,
          height: logoHeight,
        })
      } else {
        page.drawText('FLOLIA', {
          x: pos.x + 10,
          y: pos.y + CARD_HEIGHT - 18,
          size: 14,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        })
      }

      // MEMBER CARDテキスト
      page.drawText('MEMBER CARD', {
        x: pos.x + CARD_WIDTH - 75,
        y: pos.y + CARD_HEIGHT - 18,
        size: 8,
        font: helvetica,
        color: rgb(1, 1, 1),
      })

      // QRコード（左側に配置）
      const qrSize = 70
      page.drawImage(qrImage, {
        x: pos.x + 10,
        y: pos.y + 10,
        width: qrSize,
        height: qrSize,
      })

      // 会員写真（右側に配置）
      if (memberPhotoImage) {
        const photoHeight = 65
        const photoWidth = (memberPhotoImage.width / memberPhotoImage.height) * photoHeight
        // 写真を右端に配置（最大幅を制限）
        const maxPhotoWidth = 55
        const finalPhotoWidth = Math.min(photoWidth, maxPhotoWidth)
        const finalPhotoHeight = (finalPhotoWidth / photoWidth) * photoHeight

        // 写真の枠
        page.drawRectangle({
          x: pos.x + CARD_WIDTH - finalPhotoWidth - 12,
          y: pos.y + 10,
          width: finalPhotoWidth + 4,
          height: finalPhotoHeight + 4,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 0.5,
          color: rgb(0.95, 0.95, 0.95),
        })

        page.drawImage(memberPhotoImage, {
          x: pos.x + CARD_WIDTH - finalPhotoWidth - 10,
          y: pos.y + 12,
          width: finalPhotoWidth,
          height: finalPhotoHeight,
        })
      }

      // 中央エリア（QRコードと写真の間）に会員情報を配置
      const infoAreaX = pos.x + qrSize + 20

      // 会員番号
      const memberNumber = String(member.member_number || 'N/A')
      page.drawText('No.', {
        x: infoAreaX,
        y: pos.y + CARD_HEIGHT - 45,
        size: 8,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      })
      page.drawText(memberNumber, {
        x: infoAreaX + 15,
        y: pos.y + CARD_HEIGHT - 45,
        size: 10,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      })

      // 会員名（英字のみ対応、日本語は表示できない）
      // 名前をローマ字風に変換するか、会員番号のみ表示
      page.drawText('NAME', {
        x: infoAreaX,
        y: pos.y + CARD_HEIGHT - 65,
        size: 8,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      })

      // 会員名をふりがなからローマ字に変換して表示
      const fullNameKana = `${member.last_name_kana || ''} ${member.first_name_kana || ''}`.trim()
      const nameRomaji = kanaToRomaji(fullNameKana)
      const nameDisplay = nameRomaji || String(member.member_number || 'MEMBER')
      // 写真がある場合は名前の長さを制限
      const maxNameLength = memberPhotoImage ? 15 : 20
      page.drawText(nameDisplay.substring(0, maxNameLength), {
        x: infoAreaX,
        y: pos.y + CARD_HEIGHT - 80,
        size: 9,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1),
      })

    }

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="member-card-${member.member_number || memberId}.pdf"`,
      },
    })
  } catch (error) {
    return internalErrorResponse('Member card PDF generation', error)
  }
}
