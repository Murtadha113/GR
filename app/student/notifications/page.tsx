"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, CheckSquare, Calendar, FileText, Bell, Settings } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getUserNotifications, markNotificationAsRead, type Notification } from "@/lib/firebase/notifications"
import { formatDistanceToNow } from "date-fns"
import { ar } from "date-fns/locale"
import { cn } from "@/lib/utils"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
  { title: "الإعدادات", href: "/student/settings", icon: <Settings className="w-5 h-5" /> },
]

export default function StudentNotifications() {
  const { userData } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!userData?.uid) return

      try {
        const notificationsData = await getUserNotifications(userData.uid, 50)
        setNotifications(notificationsData)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [userData?.uid])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read && notification.id) {
      await markNotificationAsRead(notification.id)
      // Update local state
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-500"
      case "warning":
        return "border-yellow-500"
      case "error":
        return "border-red-500"
      default:
        return "border-blue-500"
    }
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">الإشعارات</h1>
          <p className="text-muted-foreground mt-2">آخر التحديثات والإشعارات</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Bell className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">لا توجد إشعارات</h3>
                  <p className="text-sm text-muted-foreground mt-2">سيتم عرض الإشعارات هنا عند توفرها</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md border-r-4",
                  getNotificationColor(notification.type),
                  !notification.read && "bg-accent/30",
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className={cn("text-lg", !notification.read && "font-bold")}>
                      {notification.title}
                    </CardTitle>
                    {!notification.read && <div className="w-2 h-2 bg-primary rounded-full mt-2" />}
                  </div>
                  <CardDescription>{notification.message}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {notification.createdAt &&
                      formatDistanceToNow(notification.createdAt.toDate(), {
                        addSuffix: true,
                        locale: ar,
                      })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
