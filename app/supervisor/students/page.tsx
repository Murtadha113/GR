"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  Home,
  FolderKanban,
  Users,
  Star,
  Calendar,
  Mail,
  FileText,
  Eye,
  CheckSquare,
  MessageSquare,
  Award,
  Bell,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"

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

export default function SupervisorStudents() {
  const { userData } = useAuth()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStudents = async () => {
      if (!userData?.uid) return

      try {
        setLoading(true)
        const db = getFirebaseDb()

        const studentsQuery = query(collection(db, "users"), where("role", "==", "student"))
        const studentsSnapshot = await getDocs(studentsQuery)

        const allStudents = studentsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        const supervisorStudents = allStudents.filter((student: any) => student.supervisorId === userData.uid)

        const studentsData = await Promise.all(
          supervisorStudents.map(async (studentData: any) => {
            // Get student's project if exists
            let projectData = null
            try {
              const projectsQuery = query(collection(db, "projects"), where("studentId", "==", studentData.id))
              const projectsSnapshot = await getDocs(projectsQuery)
              if (!projectsSnapshot.empty) {
                projectData = { id: projectsSnapshot.docs[0].id, ...projectsSnapshot.docs[0].data() }
              }
            } catch (err) {
              console.error("Error fetching project:", err)
            }

            // Get student's tasks count
            let totalTasks = 0
            let completedTasks = 0
            try {
              const tasksQuery = query(collection(db, "tasks"), where("studentId", "==", studentData.id))
              const tasksSnapshot = await getDocs(tasksQuery)
              totalTasks = tasksSnapshot.size
              completedTasks = tasksSnapshot.docs.filter((task) => task.data().status === "completed").length
            } catch (err) {
              console.error("Error fetching tasks:", err)
            }

            return {
              ...studentData,
              project: projectData,
              totalTasks,
              completedTasks,
            }
          }),
        )

        setStudents(studentsData)
      } catch (error) {
        console.error("Error fetching students:", error)
        toast.error("حدث خطأ أثناء تحميل بيانات الطلاب")
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [userData])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="supervisor">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">طلابي</h1>
          <p className="text-muted-foreground mt-2">إدارة ومتابعة الطلاب المسندين إليك</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الطلاب</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{students.length}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">طلاب مع مشاريع</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{students.filter((s) => s.project).length}</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">طلاب بدون مشاريع</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{students.filter((s) => !s.project).length}</div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : students.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Users className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">لا يوجد طلاب حالياً</h3>
                  <p className="text-sm text-muted-foreground mt-2">سيتم تعيين الطلاب من قبل المنسق الأكاديمي</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
            {students.map((student) => (
              <Card key={student.id} className="rounded-xl hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(student.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{student.name}</CardTitle>
                          <CardDescription className="mt-1">
                            <Badge variant="outline" className="rounded-lg">
                              {student.studentId}
                            </Badge>
                          </CardDescription>
                        </div>
                        {student.project ? (
                          <Badge className="rounded-lg bg-green-500">لديه مشروع</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-lg">
                            بدون مشروع
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{student.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">القسم: </span>
                      <span>{student.department}</span>
                    </div>
                  </div>

                  {student.project && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{student.project.title}</p>
                        <span className="text-xs text-muted-foreground">{student.project.progress || 0}%</span>
                      </div>
                      <Progress value={student.project.progress || 0} className="h-2" />
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">المهام:</span>
                    </div>
                    <span className="font-medium">
                      {student.completedTasks} / {student.totalTasks}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link href={`/supervisor/students/${student.id}`} className="flex-1">
                      <Button className="w-full rounded-lg" size="sm">
                        <Eye className="w-4 h-4 ml-2" />
                        عرض التفاصيل
                      </Button>
                    </Link>
                    {student.project && (
                      <Link href={`/supervisor/projects/${student.project.id}`}>
                        <Button variant="outline" className="rounded-lg bg-transparent" size="sm">
                          <FolderKanban className="w-4 h-4 ml-2" />
                          المشروع
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
