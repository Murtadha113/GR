"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, Users, Star, Calendar, MessageSquare, Award, Bell } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getDocuments } from "@/lib/firebase/db"
import { where } from "firebase/firestore"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/supervisor/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "المشاريع", href: "/supervisor/projects", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "الطلاب", href: "/supervisor/students", icon: <Users className="w-5 h-5" /> },
  { title: "الإعلانات", href: "/supervisor/announcements", icon: <Bell className="w-5 h-5" /> },
  { title: "المناقشات", href: "/supervisor/discussions", icon: <MessageSquare className="w-5 h-5" /> },
  { title: "الرسائل", href: "/supervisor/messages", icon: <MessageSquare className="w-5 h-5" /> },
  { title: "الدرجات", href: "/supervisor/grades", icon: <Award className="w-5 h-5" /> },
  { title: "التقييمات", href: "/supervisor/evaluations", icon: <Star className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/supervisor/meetings", icon: <Calendar className="w-5 h-5" /> },
]

export default function SupervisorDashboard() {
  const { userData, loading: authLoading } = useAuth()
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalStudents: 0,
    upcomingMeetings: 0,
  })
  const [projects, setProjects] = useState<any[]>([])
  const [recentStudents, setRecentStudents] = useState<any[]>([])
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

        const [projectsData, studentsData, meetingsData] = await Promise.all([
          getDocuments("projects", [where("supervisorId", "==", userData.uid)]),
          getDocuments("users", [where("supervisorId", "==", userData.uid)]),
          getDocuments("meetings", [where("supervisorId", "==", userData.uid), where("status", "==", "scheduled")]),
        ])

        const activeProjects = projectsData.filter((project: any) => project.status === "active").length

        setStats({
          totalProjects: projectsData.length,
          activeProjects,
          totalStudents: studentsData.length,
          upcomingMeetings: meetingsData.length,
        })

        setProjects(projectsData.slice(0, 5))
        setRecentStudents(studentsData.slice(0, 5))
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
        setError("حدث خطأ أثناء تحميل البيانات")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userData, authLoading])

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="supervisor">
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
            مرحباً، د. {userData?.name}
          </h1>
          <p className="text-muted-foreground mt-2">نظرة عامة على المشاريع والطلاب</p>
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
              <Link href="/supervisor/projects">
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

              <Link href="/supervisor/projects">
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

              <Link href="/supervisor/students">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-300 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">عدد الطلاب</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalStudents}</div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/supervisor/meetings">
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in fade-in slide-in-from-bottom duration-500 delay-[400ms] bg-gradient-to-br from-primary/10 to-primary/5 cursor-pointer border-2 hover:border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">الاجتماعات القادمة</CardTitle>
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-primary">{stats.upcomingMeetings}</div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card className="animate-in fade-in slide-in-from-right duration-700 delay-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="w-5 h-5 text-primary" />
                    المشاريع الأخيرة
                  </CardTitle>
                  <CardDescription>آخر المشاريع تحت إشرافك</CardDescription>
                </CardHeader>
                <CardContent>
                  {projects.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">لا توجد مشاريع حالياً</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {projects.map((project, index) => (
                        <Link key={project.id} href={`/supervisor/projects/${project.id}`}>
                          <div
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer animate-in fade-in slide-in-from-left duration-500"
                            style={{ animationDelay: `${(index + 6) * 100}ms` }}
                          >
                            <div className="space-y-1 flex-1">
                              <p className="text-sm font-medium">{project.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1">{project.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">التقدم:</span>
                                <Progress value={project.progress || 0} className="w-32" />
                                <span className="text-xs text-muted-foreground">{project.progress || 0}%</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="animate-in fade-in slide-in-from-left duration-700 delay-500 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    طلابي
                  </CardTitle>
                  <CardDescription>الطلاب المسندين إليك</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">لا يوجد طلاب حالياً</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentStudents.map((student, index) => (
                        <Link key={student.id} href={`/supervisor/students/${student.id}`}>
                          <div
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer animate-in fade-in slide-in-from-right duration-500"
                            style={{ animationDelay: `${(index + 6) * 100}ms` }}
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium">{student.name}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {student.studentId}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{student.department}</span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
