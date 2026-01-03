"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, Users, FileText, Archive, UserPlus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getDocuments } from "@/lib/firebase/db"
import { where } from "firebase/firestore"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/coordinator/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "جميع المشاريع", href: "/coordinator/projects", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المشرفين", href: "/coordinator/supervisors", icon: <Users className="w-5 h-5" /> },
  { title: "الطلاب", href: "/coordinator/students", icon: <UserPlus className="w-5 h-5" /> },
  { title: "التقارير", href: "/coordinator/reports", icon: <FileText className="w-5 h-5" /> },
  { title: "الأرشيف", href: "/coordinator/archive", icon: <Archive className="w-5 h-5" /> },
]

export default function CoordinatorDashboard() {
  const { userData, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalSupervisors: 0,
    totalStudents: 0,
  })
  const [recentProjects, setRecentProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) return

      try {
        setLoading(true)
        setError(null)

        const [projectsData, supervisorsData, studentsData] = await Promise.all([
          getDocuments("projects"),
          getDocuments("users", [where("role", "==", "supervisor")]),
          getDocuments("users", [where("role", "==", "student")]),
        ])

        const activeProjects = projectsData.filter((project: any) => project.status === "active").length
        const completedProjects = projectsData.filter((project: any) => project.status === "completed").length

        setStats({
          totalProjects: projectsData.length,
          activeProjects,
          completedProjects,
          totalSupervisors: supervisorsData.length,
          totalStudents: studentsData.length,
        })

        setRecentProjects(projectsData.slice(0, 5))
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("حدث خطأ أثناء تحميل البيانات")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authLoading])

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
            مرحباً، {userData?.name}
          </h1>
          <p className="text-muted-foreground mt-2">نظرة عامة شاملة على جميع المشاريع</p>
        </div>

        {authLoading || loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
              <Link href="/coordinator/projects">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-100 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي المشاريع</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FolderKanban className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalProjects}</div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/coordinator/projects">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-200 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">المشاريع النشطة</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FolderKanban className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.activeProjects}</div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/coordinator/archive">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-300 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">المشاريع المكتملة</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FolderKanban className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {stats.completedProjects}
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/coordinator/supervisors">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-[400ms] cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">المشرفين</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {stats.totalSupervisors}
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/coordinator/students">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-500 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الطلاب</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{stats.totalStudents}</div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="animate-in fade-in slide-in-from-right duration-700 delay-600 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-primary" />
                    المشاريع الأخيرة
                  </CardTitle>
                  <CardDescription>آخر المشاريع المسجلة في النظام</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                  ) : recentProjects.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">لا توجد مشاريع حالياً</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recentProjects.map((project, index) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-left duration-500"
                          style={{ animationDelay: `${(index + 7) * 100}ms` }}
                        >
                          <div className="space-y-1 flex-1">
                            <p className="text-sm font-medium">{project.title}</p>
                            <div className="flex items-center gap-2">
                              <Progress value={project.progress || 0} className="w-24" />
                              <span className="text-xs text-muted-foreground">{project.progress || 0}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-in fade-in slide-in-from-left duration-700 delay-600 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    إحصائيات سريعة
                  </CardTitle>
                  <CardDescription>نظرة عامة على الأداء</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">معدل إنجاز المشاريع</span>
                    <span className="text-sm font-bold">
                      {stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%
                    </span>
                  </div>
                  <Progress
                    value={
                      stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0
                    }
                  />

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm">متوسط المشاريع لكل مشرف</span>
                    <span className="text-sm font-bold">
                      {stats.totalSupervisors > 0 ? (stats.totalProjects / stats.totalSupervisors).toFixed(1) : 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm">متوسط الطلاب لكل مشرف</span>
                    <span className="text-sm font-bold">
                      {stats.totalSupervisors > 0 ? (stats.totalStudents / stats.totalSupervisors).toFixed(1) : 0}
                    </span>
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
