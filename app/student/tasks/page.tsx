"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, CheckSquare, Calendar, FileText, Bell, Settings } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createNotification } from "@/lib/firebase/notifications"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
  { title: "الإعدادات", href: "/student/settings", icon: <Settings className="w-5 h-5" /> },
]

export default function StudentTasks() {
  const { userData, loading: authLoading } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTasks = async () => {
      if (authLoading) return

      if (!userData?.uid) {
        setLoading(false)
        setError("لم يتم العثور على بيانات المستخدم")
        return
      }

      try {
        setLoading(true)
        setError(null)

        const tasksQuery = query(collection(db, "tasks"), where("studentId", "==", userData.uid))
        const tasksSnapshot = await getDocs(tasksQuery)
        const tasksData = tasksSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setTasks(tasksData)
      } catch (error) {
        console.error("Error fetching tasks:", error)
        setError("حدث خطأ أثناء تحميل المهام")
      } finally {
        setLoading(false)
      }
    }

    fetchTasks()
  }, [userData, authLoading])

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const task = tasks.find((t) => t.id === taskId)

      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      })

      setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: newStatus } : task)))

      if (task?.supervisorId && newStatus === "completed") {
        await createNotification({
          userId: task.supervisorId,
          title: "مهمة مكتملة",
          message: `قام الطالب بإكمال المهمة: ${task.title}`,
          type: "task",
        })
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const pendingTasks = tasks.filter((task) => task.status === "pending")
  const inProgressTasks = tasks.filter((task) => task.status === "in-progress")
  const completedTasks = tasks.filter((task) => task.status === "completed")

  const TaskCard = ({ task }: { task: any }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </div>
          <Badge
            variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"}
          >
            {task.priority === "high" ? "عالية" : task.priority === "medium" ? "متوسطة" : "منخفضة"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            الموعد النهائي:{" "}
            {task.dueDate ? new Date(task.dueDate.seconds * 1000).toLocaleDateString("ar-EG") : "غير محدد"}
          </div>
          <div className="flex gap-2">
            {task.status === "pending" && (
              <Button size="sm" onClick={() => handleStatusChange(task.id, "in-progress")}>
                بدء العمل
              </Button>
            )}
            {task.status === "in-progress" && (
              <Button size="sm" onClick={() => handleStatusChange(task.id, "completed")}>
                إكمال
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">المهام</h1>
            <p className="text-muted-foreground mt-2">إدارة ومتابعة مهام المشروع</p>
          </div>
        </div>

        {authLoading || loading ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-destructive">
                <h3 className="text-lg font-semibold">حدث خطأ</h3>
                <p className="text-sm mt-2">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <CheckSquare className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">لا توجد مهام حالياً</h3>
                  <p className="text-sm text-muted-foreground mt-2">سيتم إضافة المهام من قبل المشرف</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">الكل ({tasks.length})</TabsTrigger>
              <TabsTrigger value="pending">جديدة ({pendingTasks.length})</TabsTrigger>
              <TabsTrigger value="in-progress">قيد التنفيذ ({inProgressTasks.length})</TabsTrigger>
              <TabsTrigger value="completed">مكتملة ({completedTasks.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {tasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              {pendingTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد مهام جديدة</p>
              ) : (
                pendingTasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </TabsContent>

            <TabsContent value="in-progress" className="space-y-4">
              {inProgressTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد مهام قيد التنفيذ</p>
              ) : (
                inProgressTasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              {completedTasks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا توجد مهام مكتملة</p>
              ) : (
                completedTasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  )
}
