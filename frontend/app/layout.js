import './globals.css'
import { Zen_Maru_Gothic, Shippori_Mincho } from 'next/font/google'
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics'
import PageViewTracker from '@/components/analytics/PageViewTracker'

const zenMaruGothic = Zen_Maru_Gothic({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-zen-maru',
  display: 'swap',
})

const shipporiMincho = Shippori_Mincho({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-shippori',
  display: 'swap',
})

export const metadata = {
  title: 'FLOLIA - キックボクシングスタジオ',
  description: '通うたびに、前向きになる。今日のストレスを、明日のチカラに。',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ja" className={`${zenMaruGothic.variable} ${shipporiMincho.variable}`}>
      <body>
        <GoogleAnalytics measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        <PageViewTracker />
        {children}
      </body>
    </html>
  )
}
