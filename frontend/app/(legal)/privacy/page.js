import LegalPage from '@/components/LegalPage'

export const metadata = {
  title: 'プライバシーポリシー | FLOLIA',
  description: 'FLOLIAのプライバシーポリシー',
}

export default function PrivacyPage() {
  return <LegalPage slug="privacy" fallbackTitle="プライバシーポリシー" />
}
