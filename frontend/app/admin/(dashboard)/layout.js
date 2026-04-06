'use client'

import { Suspense } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'
import SessionTimeout from '@/components/admin/SessionTimeout'
import { StoreProvider } from '@/lib/contexts/StoreContext'
import { AuthProvider } from '@/lib/contexts/AuthContext'

function DashboardContent({ children }) {
  return (
    <div className="min-h-screen bg-gray-900">
      <AdminSidebar />
      <SessionTimeout />
      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Mobile header spacing */}
        <div className="lg:hidden h-14" />
        {/* Desktop Header */}
        <AdminHeader />
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    }>
      <AuthProvider>
        <StoreProvider>
          <DashboardContent>{children}</DashboardContent>
        </StoreProvider>
      </AuthProvider>
    </Suspense>
  )
}
