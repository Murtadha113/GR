"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  Users,
  Award,
  Plus,
  Edit,
  Upload,
  CheckCircle2,
  Clock,
  Download,
  FileIcon,
  ImageIcon,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp, orderBy } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createNotification } from "@/lib/firebase/notifications"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import type { SubmittedFile } from "@/lib/types"
import { supervisorSidebarItems } from "@/lib/constants/supervisor-sidebar"

interface Student {
  id: string
  name: string
  email: string
  projectId: string
  projectTitle?: string
}

interface Task {
  id: string
  studentId: string
  studentName: string
  projectId: string
  title: string
  description: string
  maxGrade: number
  weight: number
  dueDate: any
  status: "pending" | "submitted" | "graded"
  submissionText?: string
  submittedFiles?: SubmittedFile[]
  submittedAt?: any
  grade?: number
  feedback?: string
  gradedAt?: any
  gradedBy?: string
  createdAt: any
}

export default function SupervisorTasks() {
  const { userData, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState({
    studentId: "",
    title: "",
    description: "",
    maxGrade: "100",
    weight: "10",
    dueDate: "",
  })
  const [gradeForm, setGradeForm] = useState({
    grade: "",
    feedback: "",
  })

  useEffect(() => {
    if (!authLoading && userData) {
      fetchData()
    }
  }, [userData, authLoading])

  const fetchData = async () => {
    if (!userData) return

    try {
      setLoading(true)
      const db = getFirebaseDb()

      // Fetch students
      const studentsQuery = query(collection(db, "users"), where("supervisorId", "==", userData.uid))
      const studentsSnapshot = await getDocs(studentsQuery)
      const studentsData = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[]

      // Fetch projects
      const projectsQuery = query(collection(db, "projects"), where("supervisorId", "==", userData.uid))
      const projectsSnapshot = await getDocs(projectsQuery)
      const projects = new Map(projectsSnapshot.docs.map((doc) => [doc.id, doc.data().title]))

      studentsData.forEach((student) => {
        if (student.projectId) {
          student.projectTitle = projects.get(student.projectId)
        }
      })

      setStudents(studentsData)

      // Fetch tasks
      const tasksQuery = query(
        collection(db, "tasks"),
        where("supervisorId", "==", userData.uid),
        orderBy("createdAt", "desc"),
      )
      const tasksSnapshot = await getDocs(tasksQuery)
      const tasksData = tasksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[]
      setTasks(tasksData)
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast.error("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!taskForm.studentId || !taskForm.title || !taskForm.maxGrade || !taskForm.weight || !taskForm.dueDate) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    const maxGrade = Number.parseFloat(taskForm.maxGrade)
    const weight = Number.parseFloat(taskForm.weight)

    if (maxGrade <= 0 || maxGrade > 100) {
      toast.error("الدرجة القصوى يجب أن تكون بين 1 و 100")
      return
    }

    if (weight <= 0 || weight > 100) {
      toast.error("الوزن يجب أن يكون بين 1 و 100")
      return
    }

    try {
      const db = getFirebaseDb()
      const student = students.find((s) => s.id === taskForm.studentId)

      if (!student) {
        toast.error("الطالب غير موجود")
        return
      }

      const taskData = {
        studentId: taskForm.studentId,
        studentName: student.name,
        projectId: student.projectId,
        supervisorId: userData?.uid,
        title: taskForm.title,
        description: taskForm.description,
        maxGrade,
        weight,
        dueDate: Timestamp.fromDate(new Date(`${taskForm.dueDate}T23:59:59`)),
        status: "pending" as const,
        createdAt: Timestamp.now(),
      }

      await addDoc(collection(db, "tasks"), taskData)

      await createNotification({
        userId: taskForm.studentId,
        title: "مهمة جديدة",
        message: `تم إضافة مهمة جديدة: ${taskForm.title} - الدرجة: ${maxGrade} - الوزن: ${weight}%`,
        type: "task",
      })

      toast.success("تم إضافة المهمة بنجاح")
      setTaskDialogOpen(false)
      setTaskForm({
        studentId: "",
        title: "",
        description: "",
        maxGrade: "100",
        weight: "10",
        dueDate: "",
      })
      fetchData()
    } catch (error) {
      console.error("[v0] Error creating task:", error)
      toast.error("حدث خطأ أثناء إضافة المهمة")
    }
  }

  const handleGradeTask = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTask || !gradeForm.grade) {
      toast.error("يرجى إدخال الدرجة")
      return
    }

    const grade = Number.parseFloat(gradeForm.grade)

    if (grade < 0 || grade > selectedTask.maxGrade) {
      toast.error(`الدرجة يجب أن تكون بين 0 و ${selectedTask.maxGrade}`)
      return
    }

    try {
      const db = getFirebaseDb()

      await updateDoc(doc(db, "tasks", selectedTask.id), {
        grade,
        feedback: gradeForm.feedback,
        status: "graded",
        gradedAt: Timestamp.now(),
        gradedBy: userData?.uid,
      })

      await createNotification({
        userId: selectedTask.studentId,
        title: "تم تقييم المهمة",
        message: `تم تقييم مهمة "${selectedTask.title}" - الدرجة: ${grade}/${selectedTask.maxGrade}`,
        type: "grade",
      })

      toast.success("تم تقييم المهمة بنجاح")
      setGradeDialogOpen(false)
      setSelectedTask(null)
      setGradeForm({ grade: "", feedback: "" })
      fetchData()
    } catch (error) {
      console.error("[v0] Error grading task:", error)
      toast.error("حدث خطأ أثناء تقييم المهمة")
    }
  }

  const openGradeDialog = (task: Task) => {
    setSelectedTask(task)
    setGradeForm({
      grade: task.grade?.toString() || "",
      feedback: task.feedback || "",
    })
    setGradeDialogOpen(true)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "غير محدد"
    return timestamp.toDate().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStudentTasks = (studentId: string) => {
    return tasks.filter((t) => t.studentId === studentId)
  }

  const calculateStudentGrade = (studentId: string) => {
    const studentTasks = getStudentTasks(studentId).filter((t) => t.status === "graded")
    if (studentTasks.length === 0) return { total: 0, weighted: 0, percentage: 0 }

    const weightedSum = studentTasks.reduce((sum, t) => {
      const taskPercentage = ((t.grade || 0) / t.maxGrade) * 100
      return sum + taskPercentage * (t.weight / 100)
    }, 0)

    const totalWeight = studentTasks.reduce((sum, t) => sum + t.weight, 0)
    const percentage = totalWeight > 0 ? weightedSum : 0

    return {
      total: Math.round(percentage),
      weighted: Math.round(weightedSum * 10) / 10,
      percentage: Math.round(percentage),
    }
  }

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          >
            <Clock className="w-3 h-3" />
            في الانتظار
          </Badge>
        )
      case "submitted":
        return (
          <Badge variant="default" className="gap-1 bg-blue-500">
            <Upload className="w-3 h-3" />
            تم التسليم
          </Badge>
        )
      case "graded":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle2 className="w-3 h-3" />
            تم التقييم
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const pendingTasks = tasks.filter((t) => t.status === "pending")
  const submittedTasks = tasks.filter((t) => t.status === "submitted")
  const gradedTasks = tasks.filter((t) => t.status === "graded")

  return (
    <DashboardLayout sidebarItems={supervisorSidebarItems} requiredRole="supervisor">
      <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                <Award className="w-8 h-8 text-primary" />
              </div>
              إدارة المهام والتقييم
            </h1>
            <p className="text-muted-foreground mt-2">إنشاء المهام وتقييم الطلاب بنظام متكامل من 100</p>
          </div>

          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg">
                <Plus className="w-4 h-4" />
                مهمة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>إضافة مهمة جديدة</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student">الطالب *</Label>
                  <Select
                    value={taskForm.studentId}
                    onValueChange={(value) => setTaskForm({ ...taskForm, studentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطالب" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} - {student.projectTitle || "بدون مشروع"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">عنوان المهمة *</Label>
                  <Input
                    id="title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    placeholder="مثال: تسليم التقرير النهائي"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">وصف المهمة</Label>
                  <Textarea
                    id="description"
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    placeholder="تفاصيل المهمة والمتطلبات"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxGrade">الدرجة القصوى *</Label>
                    <Input
                      id="maxGrade"
                      type="number"
                      min="1"
                      max="100"
                      value={taskForm.maxGrade}
                      onChange={(e) => setTaskForm({ ...taskForm, maxGrade: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">الوزن (%) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="1"
                      max="100"
                      step="0.1"
                      value={taskForm.weight}
                      onChange={(e) => setTaskForm({ ...taskForm, weight: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">تاريخ التسليم *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={taskForm.dueDate}
                      onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setTaskDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit">إضافة المهمة</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المهام</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{tasks.length}</div>
            </CardContent>
          </Card>
          <Card className="border-2 hover:shadow-lg transition-shadow border-amber-200 dark:border-amber-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">في الانتظار</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{pendingTasks.length}</div>
            </CardContent>
          </Card>
          <Card className="border-2 hover:shadow-lg transition-shadow border-blue-200 dark:border-blue-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">تم التسليم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{submittedTasks.length}</div>
            </CardContent>
          </Card>
          <Card className="border-2 hover:shadow-lg transition-shadow border-green-200 dark:border-green-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">تم التقييم</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{gradedTasks.length}</div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : students.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">لا يوجد طلاب</h3>
              <p className="text-sm text-muted-foreground">لا يوجد طلاب مسجلين تحت إشرافك حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="by-student" className="space-y-4">
            <TabsList>
              <TabsTrigger value="by-student">حسب الطالب</TabsTrigger>
              <TabsTrigger value="by-status">حسب الحالة</TabsTrigger>
            </TabsList>

            <TabsContent value="by-student" className="space-y-6">
              {students.map((student, index) => {
                const studentTasks = getStudentTasks(student.id)
                const gradeInfo = calculateStudentGrade(student.id)

                return (
                  <Card
                    key={student.id}
                    className="animate-in fade-in slide-in-from-bottom duration-500 hover:shadow-lg transition-shadow"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <Avatar className="w-12 h-12 border-2">
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-bold text-lg">
                              {student.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{student.name}</CardTitle>
                            <CardDescription>{student.projectTitle || "بدون مشروع"}</CardDescription>
                          </div>
                        </div>
                        <div className="text-left space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="text-3xl font-bold text-primary">{gradeInfo.total}</div>
                            <div className="text-muted-foreground">/100</div>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {studentTasks.filter((t) => t.status === "graded").length} من {studentTasks.length} مهمة
                          </p>
                          <Progress value={gradeInfo.percentage} className="w-32 h-2" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {studentTasks.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground bg-muted/50 rounded-lg">
                          <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>لم يتم إضافة مهام لهذا الطالب بعد</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {studentTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                              onClick={() => task.status === "submitted" && openGradeDialog(task)}
                            >
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{task.title}</p>
                                  {getTaskStatusBadge(task.status)}
                                </div>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>الدرجة القصوى: {task.maxGrade}</span>
                                  <span>الوزن: {task.weight}%</span>
                                  <span>التسليم: {formatDate(task.dueDate)}</span>
                                </div>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mr-4">
                                {task.status === "graded" ? (
                                  <div className="text-left">
                                    <div className="text-2xl font-bold text-green-600">{task.grade}</div>
                                    <div className="text-xs text-muted-foreground">/{task.maxGrade}</div>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="mt-1 h-7 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        openGradeDialog(task)
                                      }}
                                    >
                                      <Edit className="w-3 h-3 ml-1" />
                                      تعديل
                                    </Button>
                                  </div>
                                ) : task.status === "submitted" ? (
                                  <Button size="sm" className="gap-2">
                                    <Award className="w-4 h-4" />
                                    تقييم
                                  </Button>
                                ) : (
                                  <Badge variant="secondary">لم يتم التسليم</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>

            <TabsContent value="by-status" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-500" />
                    المهام المسلمة ({submittedTasks.length})
                  </CardTitle>
                  <CardDescription>مهام بانتظار التقييم - أولوية عالية</CardDescription>
                </CardHeader>
                <CardContent>
                  {submittedTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">لا توجد مهام مسلمة</p>
                  ) : (
                    <div className="space-y-3">
                      {submittedTasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => openGradeDialog(task)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{task.title}</p>
                              <Badge variant="secondary">{task.studentName}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              تم التسليم: {formatDate(task.submittedAt)} • الدرجة القصوى: {task.maxGrade} • الوزن:{" "}
                              {task.weight}%
                            </p>
                          </div>
                          <Button className="gap-2" onClick={() => openGradeDialog(task)}>
                            <Award className="w-4 h-4" />
                            تقييم الآن
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-500" />
                    المهام في الانتظار ({pendingTasks.length})
                  </CardTitle>
                  <CardDescription>مهام لم يتم تسليمها بعد</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingTasks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">لا توجد مهام في الانتظار</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingTasks.map((task) => (
                        <div key={task.id} className="flex items-center justify-between p-4 rounded-lg border">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">{task.title}</p>
                              <Badge variant="secondary">{task.studentName}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              التسليم: {formatDate(task.dueDate)} • الدرجة: {task.maxGrade} • الوزن: {task.weight}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    المهام المقيمة ({gradedTasks.length})
                  </CardTitle>
                  <CardDescription>مهام تم تقييمها بنجاح</CardDescription>
                </CardHeader>
                {gradedTasks.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">لا توجد مهام مقيمة</p>
                ) : (
                  <div className="space-y-3">
                    {gradedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => openGradeDialog(task)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold">{task.title}</p>
                            <Badge variant="secondary">{task.studentName}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            تم التقييم: {formatDate(task.gradedAt)} • الوزن: {task.weight}%
                          </p>
                        </div>
                        <div className="text-left">
                          <div className="text-2xl font-bold text-green-600">
                            {task.grade}/{task.maxGrade}
                          </div>
                          <Button size="sm" variant="outline" className="mt-2 bg-transparent">
                            <Edit className="w-3 h-3 ml-1" />
                            تعديل
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">تقييم المهمة</DialogTitle>
            </DialogHeader>
            {selectedTask && (
              <div className="space-y-5">
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      {selectedTask.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3 flex-wrap">
                      <span>الطالب: {selectedTask.studentName}</span>
                      <span>•</span>
                      <span>الدرجة القصوى: {selectedTask.maxGrade}</span>
                      <span>•</span>
                      <span>الوزن: {selectedTask.weight}%</span>
                    </CardDescription>
                  </CardHeader>
                  {selectedTask.description && (
                    <CardContent>
                      <Label className="text-sm font-medium">وصف المهمة:</Label>
                      <p className="text-sm text-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                        {selectedTask.description}
                      </p>
                    </CardContent>
                  )}
                </Card>

                {/* Submission Details */}
                {selectedTask.status !== "pending" && (
                  <Card className="border-2 bg-blue-50/50 dark:bg-blue-950/10">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Upload className="w-5 h-5 text-blue-600" />
                        تفاصيل التسليم
                      </CardTitle>
                      <CardDescription>تم التسليم: {formatDate(selectedTask.submittedAt)}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedTask.submissionText && (
                        <div>
                          <Label className="text-sm font-medium">ملاحظات الطالب:</Label>
                          <p className="text-sm text-foreground mt-1 whitespace-pre-wrap bg-white dark:bg-gray-900 p-3 rounded-lg border">
                            {selectedTask.submissionText}
                          </p>
                        </div>
                      )}

                      {selectedTask.submittedFiles && selectedTask.submittedFiles.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium mb-2 block">
                            الملفات المرفقة ({selectedTask.submittedFiles.length}):
                          </Label>
                          <div className="space-y-2">
                            {selectedTask.submittedFiles.map((file, index) => (
                              <a
                                key={index}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg border hover:border-blue-400 transition-all group hover:shadow-md"
                              >
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                  {file.isImage ? (
                                    <ImageIcon className="w-5 h-5 text-blue-600" />
                                  ) : (
                                    <FileIcon className="w-5 h-5 text-blue-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate group-hover:text-blue-600 transition-colors">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)}
                                    {file.isImage && " • صورة"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                                  <Download className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Grading Form */}
                <form onSubmit={handleGradeTask} className="space-y-4">
                  <Card className="border-2">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Award className="w-5 h-5 text-primary" />
                        التقييم
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="grade" className="text-base">
                          الدرجة * (من {selectedTask.maxGrade})
                        </Label>
                        <Input
                          id="grade"
                          type="number"
                          min="0"
                          max={selectedTask.maxGrade}
                          step="0.5"
                          value={gradeForm.grade}
                          onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                          placeholder={`0 - ${selectedTask.maxGrade}`}
                          required
                          className="text-lg font-semibold"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="feedback" className="text-base">
                          الملاحظات والتغذية الراجعة
                        </Label>
                        <Textarea
                          id="feedback"
                          value={gradeForm.feedback}
                          onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                          placeholder="أضف ملاحظاتك وتوجيهاتك للطالب حول أدائه..."
                          rows={6}
                          className="resize-none"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex gap-3 justify-end pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setGradeDialogOpen(false)
                        setSelectedTask(null)
                        setGradeForm({ grade: "", feedback: "" })
                      }}
                      size="lg"
                    >
                      إلغاء
                    </Button>
                    <Button type="submit" className="gap-2" size="lg">
                      <Award className="w-4 h-4" />
                      {selectedTask.status === "graded" ? "تحديث التقييم" : "حفظ التقييم"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
