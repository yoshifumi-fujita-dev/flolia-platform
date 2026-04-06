import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBookingConfirmation({ to, name, date, time, type }) {
  const typeLabel = type === 'trial' ? '体験' : '見学'

  const { data, error } = await resend.emails.send({
    from: 'FLOLIA <noreply@flolia.jp>',
    to: [to],
    subject: '【FLOLIA】ご予約ありがとうございます',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">FLOLIA Kickboxing Studio</h2>
        <p>${name}様</p>
        <p>この度はFLOLIA Kickboxing Studioの${typeLabel}をご予約いただき、誠にありがとうございます。</p>

        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #7c3aed;">ご予約内容</h3>
          <p><strong>日時：</strong>${date} ${time}</p>
          <p><strong>種別：</strong>${typeLabel}</p>
        </div>

        <h3 style="color: #7c3aed;">ご来店時のお持ち物</h3>
        <ul>
          <li>動きやすい服装</li>
          <li>タオル</li>
          <li>お飲み物</li>
        </ul>

        <p>ご不明な点がございましたら、お気軽にお問い合わせください。<br>
        当日お会いできることを楽しみにしております。</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          FLOLIA Kickboxing Studio<br>
          株式会社FLOLIA
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Email send error:', error)
    throw error
  }

  return data
}

export async function sendAdminNotification({ name, email, phone, date, time, type }) {
  const typeLabel = type === 'trial' ? '体験' : '見学'
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@flolia.jp'

  const { data, error } = await resend.emails.send({
    from: 'FLOLIA <noreply@flolia.jp>',
    to: [adminEmail],
    subject: `【新規予約】${date} ${time} - ${name}様`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">新規予約が入りました</h2>

        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #7c3aed;">予約詳細</h3>
          <p><strong>お名前：</strong>${name}</p>
          <p><strong>電話番号：</strong>${phone}</p>
          <p><strong>メール：</strong>${email}</p>
          <p><strong>日時：</strong>${date} ${time}</p>
          <p><strong>種別：</strong>${typeLabel}</p>
        </div>

        <p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/backoffice/bookings"
             style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            管理画面で確認する
          </a>
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Admin notification error:', error)
    throw error
  }

  return data
}

export async function sendBookingReminder({ to, name, date, time, type, qr_token }) {
  const typeLabel = type === 'trial' ? '体験' : '見学'

  // QRコードのデータ（予約用）
  const qrData = `flolia://booking/${qr_token}`

  // Google Charts APIでQRコード画像を生成
  const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(qrData)}&choe=UTF-8`

  // QRコードセクション（qr_tokenがある場合のみ表示）
  const qrCodeSection = qr_token
    ? `
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="margin-top: 0; color: #16a34a;">入館用QRコード</h3>
          <p style="color: #15803d; font-size: 14px; margin-bottom: 15px;">
            当日、受付タブレットでこのQRコードをスキャンして入館してください
          </p>
          <img src="${qrCodeUrl}" alt="入館用QRコード" style="width: 180px; height: 180px; margin: 0 auto;" />
          <p style="color: #dc2626; font-size: 12px; margin-top: 15px;">
            ※このQRコードは予約日当日のみ有効です
          </p>
        </div>
      `
    : ''

  const { data, error } = await resend.emails.send({
    from: 'FLOLIA <noreply@flolia.jp>',
    to: [to],
    subject: '【FLOLIA】明日のご予約リマインダー',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">FLOLIA Kickboxing Studio</h2>
        <p>${name}様</p>
        <p>明日の${typeLabel}のご予約についてお知らせいたします。</p>

        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #7c3aed;">ご予約内容</h3>
          <p><strong>日時：</strong>${date} ${time}</p>
          <p><strong>種別：</strong>${typeLabel}</p>
        </div>

        ${qrCodeSection}

        <h3 style="color: #7c3aed;">ご来店時のお持ち物</h3>
        <ul>
          <li>動きやすい服装</li>
          <li>タオル</li>
          <li>お飲み物</li>
        </ul>

        <p style="color: #dc2626; font-weight: bold;">
          ※ご都合が悪くなった場合は、お早めにご連絡ください。
        </p>

        <p>明日お会いできることを楽しみにしております。</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          FLOLIA Kickboxing Studio<br>
          株式会社FLOLIA
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Reminder email error:', error)
    throw error
  }

  return data
}

export async function sendStaffAccountCreated({ to, name, password }) {
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/backoffice/login`

  const { data, error } = await resend.emails.send({
    from: 'FLOLIA <noreply@flolia.jp>',
    to: [to],
    subject: '【FLOLIA】管理画面ログインアカウントが作成されました',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">FLOLIA 管理システム</h2>
        <p>${name}様</p>
        <p>管理画面へのログインアカウントが作成されました。</p>

        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #7c3aed;">ログイン情報</h3>
          <p><strong>メールアドレス：</strong>${to}</p>
          <p><strong>パスワード：</strong>${password}</p>
        </div>

        <p>
          <a href="${loginUrl}"
             style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
            管理画面にログイン
          </a>
        </p>

        <p style="color: #dc2626; font-weight: bold; margin-top: 20px;">
          ※セキュリティのため、初回ログイン後にパスワードを変更することをお勧めします。
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          FLOLIA Kickboxing Studio<br>
          株式会社FLOLIA
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Staff account email error:', error)
    throw error
  }

  return data
}

export async function sendRefundCompleted({ to, name, amount, refundDate }) {
  const formattedAmount = `${amount.toLocaleString()}円`
  const date = new Date(refundDate)
  const formattedDate = Number.isNaN(date.getTime())
    ? refundDate
    : `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`

  const { data, error } = await resend.emails.send({
    from: 'FLOLIA <noreply@flolia.jp>',
    to: [to],
    subject: '【FLOLIA】返金処理完了のお知らせ',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">FLOLIA Kickboxing Studio</h2>
        <p>${name}様</p>
        <p>返金処理が完了しました。カード会社での反映には数日かかる場合があります。</p>

        <div style="background: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #7c3aed;">返金内容</h3>
          <p><strong>返金金額：</strong>${formattedAmount}</p>
          <p><strong>返金日：</strong>${formattedDate}</p>
        </div>

        <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          FLOLIA Kickboxing Studio<br>
          株式会社FLOLIA
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Refund email error:', error)
    throw error
  }

  return data
}

/**
 * 物販購入明細メールを送信
 */
export async function sendProductPurchaseStatement({
  to,
  name,
  targetMonth,
  purchases,
  totalAmount,
  cardLast4,
  settledAt,
}) {
  // 対象月を表示用にフォーマット（2025-01 → 2025年1月）
  const [year, month] = targetMonth.split('-')
  const monthDisplay = `${year}年${parseInt(month)}月`

  // 購入明細のHTML行を生成
  const purchaseRows = purchases
    .map(
      (p) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${p.productName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">¥${p.price.toLocaleString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">¥${p.amount.toLocaleString()}</td>
        </tr>
      `
    )
    .join('')

  const { data, error } = await resend.emails.send({
    from: 'FLOLIA <noreply@flolia.jp>',
    to: [to],
    subject: `【FLOLIA】物販ご利用明細（${monthDisplay}分）`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">FLOLIA Kickboxing Studio</h2>
        <h3 style="color: #374151;">物販ご利用明細（${monthDisplay}分）</h3>

        <p>${name}様</p>
        <p>いつもFLOLIAをご利用いただき、誠にありがとうございます。<br>
        ${monthDisplay}分の物販ご利用明細をお送りいたします。</p>

        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #7c3aed;">ご利用明細</h4>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db;">日付</th>
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db;">商品名</th>
                <th style="padding: 8px; text-align: center; border-bottom: 2px solid #d1d5db;">数量</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #d1d5db;">単価</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #d1d5db;">小計</th>
              </tr>
            </thead>
            <tbody>
              ${purchaseRows}
            </tbody>
            <tfoot>
              <tr style="font-weight: bold; background: #f5f3ff;">
                <td colspan="4" style="padding: 12px; text-align: right;">合計（税込）</td>
                <td style="padding: 12px; text-align: right; color: #7c3aed; font-size: 18px;">¥${totalAmount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #16a34a;">決済情報</h4>
          <p style="margin: 0;"><strong>決済日：</strong>${settledAt}</p>
          <p style="margin: 8px 0 0;"><strong>カード：</strong>**** **** **** ${cardLast4}</p>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          ご不明な点がございましたら、お気軽にお問い合わせください。
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          FLOLIA Kickboxing Studio<br>
          株式会社FLOLIA
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Product purchase statement email error:', error)
    throw error
  }

  return data
}
