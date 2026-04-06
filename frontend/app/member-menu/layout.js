import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: '会員メニュー | FLOLIA',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-purple-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
    </div>
  )
}

export default function MemberMenuLayout({ children }) {
  return (
    <Suspense fallback={<Loading />}>
      {children}
    </Suspense>
  )
}
