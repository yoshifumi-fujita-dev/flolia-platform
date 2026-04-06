import { resend } from '@/lib/resend/client'
import { okResponse, badRequestResponse, internalErrorResponse } from '@/lib/api-response'

export async function POST(request) {
  try {
    const { name, email, phone, category, message } = await request.json()

    // バリデーション
    if (!name || !email || !category || !message) {
      return badRequestResponse('必須項目を入力してください')
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return badRequestResponse('有効なメールアドレスを入力してください')
    }

    const categoryLabels = {
      trial: '体験・見学について',
      membership: '入会について',
      program: 'プログラムについて',
      payment: '料金・お支払いについて',
      other: 'その他',
    }

    const categoryLabel = categoryLabels[category] || category
    const adminEmail =
      process.env.CONTACT_EMAIL ||
      process.env.ADMIN_EMAIL ||
      'info@flolia.jp'

    // 管理者へのメール送信
    await resend.emails.send({
      from: 'FLOLIA <noreply@flolia.jp>',
      to: [adminEmail],
      replyTo: email,
      subject: `【お問い合わせ】${categoryLabel} - ${name}様`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">お問い合わせがありました</h2>

          <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #7c3aed;">お客様情報</h3>
            <p><strong>お名前：</strong>${name}</p>
            <p><strong>メールアドレス：</strong>${email}</p>
            <p><strong>電話番号：</strong>${phone || '未入力'}</p>
            <p><strong>お問い合わせ種別：</strong>${categoryLabel}</p>
          </div>

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">お問い合わせ内容</h3>
            <p style="white-space: pre-wrap;">${message}</p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            このメールに返信すると、お客様のメールアドレス宛に送信されます。
          </p>
        </div>
      `,
    })

    // お客様への自動返信メール
    await resend.emails.send({
      from: 'FLOLIA <noreply@flolia.jp>',
      to: [email],
      subject: '【FLOLIA】お問い合わせを受け付けました',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">FLOLIA Kickboxing Studio</h2>
          <p>${name}様</p>
          <p>この度はFLOLIA Kickboxing Studioにお問い合わせいただき、誠にありがとうございます。</p>
          <p>下記の内容でお問い合わせを受け付けました。<br>
          担当者より2〜3営業日以内にご連絡いたしますので、しばらくお待ちください。</p>

          <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #7c3aed;">お問い合わせ内容</h3>
            <p><strong>種別：</strong>${categoryLabel}</p>
            <p style="white-space: pre-wrap;"><strong>内容：</strong><br>${message}</p>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            ※このメールは自動送信されています。<br>
            このメールに返信いただいてもお答えできませんのでご了承ください。
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            FLOLIA Kickboxing Studio<br>
            株式会社FLOLIA
          </p>
        </div>
      `,
    })

    return okResponse({ success: true })
  } catch (error) {
    return internalErrorResponse('Contact form', error)
  }
}
