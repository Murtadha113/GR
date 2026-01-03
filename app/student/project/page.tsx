"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  Home,
  FolderKanban,
  CheckSquare,
  Calendar,
  FileText,
  Bell,
  Settings,
  Plus,
  MessageSquare,
  Award,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإعلانات", href: "/student/announcements", icon: <Bell className="w-5 h-5" /> },
  { title: "المناقشات", href: "/student/discussions", icon: <MessageSquare className="w-5 h-5" /> },
  { title: "الرسائل", href: "/student/messages", icon: <MessageSquare className="w-5 h-5" /> },
  { title: "الدرجات", href: "/student/grades", icon: <Award className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
  { title: "الإعدادات", href: "/student/settings", icon: <Settings className="w-5 h-5" /> },
]

export default function StudentProject() {
  const { userData, loading: authLoading } = useAuth()
  const [project, setProject] = useState<any>(null)
  const [supervisor, setSupervisor] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProject = async () => {
      if (authLoading) return

      if (!userData?.projectId) {
        setLoading(false)
        return
      }

      try {
        const projectDoc = await getDoc(doc(db, "projects", userData.projectId))
        if (projectDoc.exists()) {
          const projectData = { id: projectDoc.id, ...projectDoc.data() }
          setProject(projectData)

          if (projectData.supervisorId) {
            const supervisorDoc = await getDoc(doc(db, "users", projectData.supervisorId))
            if (supervisorDoc.exists()) {
              setSupervisor(supervisorDoc.data())
            }
          }
        }
      } catch (error) {
        console.error("Error fetching project:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProject()
  }, [userData, authLoading])

  if (authLoading || loading) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
        <div className="p-8">
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">مشروعي</h1>
            <p className="text-muted-foreground mt-2">تفاصيل مشروع التخرج الخاص بك</p>
          </div>
          {!project && (
            <Link href="/student/project/submit">
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                تقديم فكرة مشروع
              </Button>
            </Link>
          )}
        </div>

        {!project ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">لم يتم تعيين مشروع بعد</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    قدم فكرة مشروع أو انتظر تعيين مشروع من المنسق الأكاديمي
                  </p>
                  <Link href="/student/project/submit">
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 ml-2" />
                      تقديم فكرة مشروع
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl">{project.title}</CardTitle>
                    <CardDescription className="mt-2">{project.description}</CardDescription>
                  </div>
                  <Badge variant={project.status === "active" ? "default" : "secondary"}>
                    {project.status === "active" ? "نشط" : project.status === "completed" ? "مكتمل" : "معلق"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">تقدم المشروع</span>
                    <span className="text-sm text-muted-foreground">{project.progress || 0}%</span>
                  </div>
                  <Progress value={project.progress || 0} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">تاريخ البدء</p>
                    <p className="text-sm mt-1">
                      {project.startDate
                        ? new Date(project.startDate.seconds * 1000).toLocaleDateString("ar-EG")
                        : "غير محدد"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">تاريخ التسليم المتوقع</p>
                    <p className="text-sm mt-1">
                      {project.endDate
                        ? new Date(project.endDate.seconds * 1000).toLocaleDateString("ar-EG")
                        : "غير محدد"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/student/announcements">
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <Bell className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold">الإعلانات</p>
                      <p className="text-sm text-muted-foreground">آخر التحديثات</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/student/tasks">
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <CheckSquare className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold">المهام</p>
                      <p className="text-sm text-muted-foreground">التسليمات والواجبات</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/student/discussions">
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <MessageSquare className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold">المناقشات</p>
                      <p className="text-sm text-muted-foreground">منتدى النقاش</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/student/grades">
                <Card className="hover:bg-accent transition-colors cursor-pointer">
                  <CardContent className="p-6 flex items-center gap-4">
                    <Award className="w-8 h-8 text-primary" />
                    <div>
                      <p className="font-semibold">الدرجات</p>
                      <p className="text-sm text-muted-foreground">التقييمات والنتائج</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {supervisor && (
              <Card>
                <CardHeader>
                  <CardTitle>المشرف</CardTitle>
                  <CardDescription>معلومات المشرف على المشروع</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{supervisor.name}</p>
                      <p className="text-sm text-muted-foreground">{supervisor.email}</p>
                      <p className="text-sm text-muted-foreground">{supervisor.department}</p>
                    </div>
                    <Link href="/student/messages">
                      <Button>التواصل مع المشرف</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>أهداف المشروع</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {project.objectives?.map((objective: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">{objective}</span>
                    </li>
                  )) || <p className="text-sm text-muted-foreground">لم يتم تحديد أهداف بعد</p>}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
