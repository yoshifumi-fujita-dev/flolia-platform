import LegalPage from '@/components/LegalPage'

export const metadata = {
  title: '利用規約 | FLOLIA',
  description: 'FLOLIAの利用規約',
}

export default function TermsPage() {
  return <LegalPage slug="terms" fallbackTitle="利用規約" />
}
