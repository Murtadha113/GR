"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, CheckSquare, Calendar, FileText, Bell, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getDocuments, getDocument } from "@/lib/firebase/db"
import { where } from "firebase/firestore"
import Link from "next/link"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "الملف الشخصي", href: "/student/profile", icon: <User className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
]

export default function StudentDashboard() {
  const { userData, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    upcomingMeetings: 0,
    projectProgress: 0,
  })
  const [recentTasks, setRecentTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return

      if (!userData?.uid) {
        setLoading(false)
        setError("لم يتم العثور على بيانات المستخدم")
        return
      }

      try {
        setLoading(true)
        setError(null)

        const tasks = await getDocuments("tasks", [where("studentId", "==", userData.uid)])
        const completedTasks = tasks.filter((task: any) => task.status === "completed").length

        const meetings = await getDocuments("meetings", [
          where("studentId", "==", userData.uid),
          where("status", "==", "scheduled"),
        ])

        let projectProgress = 0
        if (userData.projectId) {
          const project = await getDocument("projects", userData.projectId)
          if (project) {
            projectProgress = project.progress || 0
          }
        }

        setStats({
          totalTasks: tasks.length,
          completedTasks,
          upcomingMeetings: meetings.length,
          projectProgress,
        })

        setRecentTasks(tasks.slice(0, 5))
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("حدث خطأ أثناء تحميل البيانات")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userData, authLoading])

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
            مرحباً، {userData?.name}
          </h1>
          <p className="text-muted-foreground mt-2">إليك نظرة عامة على مشروع التخرج الخاص بك</p>
        </div>

        {authLoading || loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/50 animate-in fade-in duration-500">
            <CardContent className="p-8">
              <div className="text-center text-destructive">
                <h3 className="text-lg font-semibold">حدث خطأ</h3>
                <p className="text-sm mt-2">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/student/tasks">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-100 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي المهام</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalTasks}</div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/student/tasks">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-200 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">المهام المكتملة</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.completedTasks}</div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/student/meetings">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-300 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الاجتماعات القادمة</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {stats.upcomingMeetings}
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/student/project">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-[400ms] bg-gradient-to-br from-primary/10 to-primary/5 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">تقدم المشروع</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{stats.projectProgress}%</div>
                    <Progress value={stats.projectProgress} className="mt-2 h-2" />
                  </CardContent>
                </Card>
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="animate-in fade-in slide-in-from-right duration-700 delay-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-primary" />
                    المهام الأخيرة
                  </CardTitle>
                  <CardDescription>آخر المهام المسندة إليك</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                  ) : recentTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">لا توجد مهام حالياً</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentTasks.map((task, index) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors animate-in fade-in slide-in-from-left duration-500"
                          style={{ animationDelay: `${(index + 6) * 100}ms` }}
                        >
                          <div className="space-y-1 flex-1">
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                          </div>
                          <Badge variant={task.status === "completed" ? "default" : "secondary"} className="mr-3">
                            {task.status === "completed"
                              ? "مكتملة"
                              : task.status === "in-progress"
                                ? "قيد التنفيذ"
                                : "جديدة"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-in fade-in slide-in-from-left duration-700 delay-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    الإشعارات الأخيرة
                  </CardTitle>
                  <CardDescription>آخر التحديثات والإشعارات</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 animate-in fade-in zoom-in duration-500 delay-700">
                      <div className="bg-blue-500 text-white p-2 rounded-full">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium">مرحباً بك في المنصة</p>
                        <p className="text-xs text-muted-foreground">ابدأ بإضافة مشروعك ومتابعة المهام</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
