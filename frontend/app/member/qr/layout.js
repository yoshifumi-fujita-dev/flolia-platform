export const metadata = {
  title: 'FLOLIA 会員QRコード',
  description: 'FLOLIA Kickboxing Studio 会員QRコード',
  manifest: '/manifest.json',
  themeColor: '#7c3aed',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FLOLIA QR',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function MemberQRLayout({ children }) {
  return (
    <>
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      {children}
    </>
  )
}
