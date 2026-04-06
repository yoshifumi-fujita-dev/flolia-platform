import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'

export const metadata = {
  title: 'タブレット | FLOLIA',
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
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
    </div>
  )
}

export default function TabletLayout({ children }) {
  return (
    <Suspense fallback={<Loading />}>
      {children}
    </Suspense>
  )
}
