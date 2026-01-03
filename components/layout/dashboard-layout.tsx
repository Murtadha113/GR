"use client"

import type React from "react"

import { useAuth } from "@/lib/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Sidebar } from "./sidebar"
import { Loader2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner"

interface DashboardLayoutProps {
  children: React.ReactNode
  sidebarItems: {
    title: string
    href: string
    icon: React.ReactNode
  }[]
  requiredRole: "student" | "supervisor" | "coordinator"
}

export function DashboardLayout({ children, sidebarItems, requiredRole }: DashboardLayoutProps) {
  const { user, userData, loading } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
      } else if (userData?.role !== requiredRole) {
        // Redirect to correct dashboard based on role
        if (userData?.role === "student") {
          router.push("/student/dashboard")
        } else if (userData?.role === "supervisor") {
          router.push("/supervisor/dashboard")
        } else if (userData?.role === "coordinator") {
          router.push("/coordinator/dashboard")
        }
      }
    }
  }, [user, userData, loading, router, requiredRole])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || userData?.role !== requiredRole) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 hidden lg:block border-l border-border">
        <Sidebar items={sidebarItems} userRole={requiredRole} />
      </aside>

      <div className="lg:hidden fixed top-4 left-4 z-50 flex items-center gap-2">
        <NotificationBell />
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shadow-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 p-0">
            <SheetTitle className="sr-only">القائمة الرئيسية</SheetTitle>
            <SheetDescription className="sr-only">قائمة التنقل الرئيسية للوصول إلى جميع أقسام النظام</SheetDescription>
            <Sidebar items={sidebarItems} userRole={requiredRole} onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden lg:block fixed top-4 right-4 z-50">
        <NotificationBell />
      </div>

      <main className="flex-1 overflow-y-auto bg-background w-full">
        <div className="min-h-full p-4 lg:p-6">
          <EmailVerificationBanner />
          {children}
        </div>
      </main>
    </div>
  )
}
