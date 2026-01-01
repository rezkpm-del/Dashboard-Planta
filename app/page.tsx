"use client"

import { Suspense } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { LoginPage } from "@/components/login-page"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthProvider, useAuth } from "@/lib/auth-context"

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function AuthGate() {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (!currentUser) {
    return <LoginPage />
  }

  return <DashboardLayout />
}

export default function Page() {
  return (
    <AuthProvider>
      <Suspense fallback={<DashboardSkeleton />}>
        <AuthGate />
      </Suspense>
    </AuthProvider>
  )
}
