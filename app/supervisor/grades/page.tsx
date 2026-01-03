"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, Users, Star, Calendar, MessageCircle, Award, Plus, Edit } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, query, where, getDocs, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { createNotification } from "@/lib/firebase/notifications"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/supervisor/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "المشاريع", href: "/supervisor/projects", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "الطلاب", href: "/supervisor/students", icon: <Users className="w-5 h-5" /> },
  { title: "التقييمات", href: "/supervisor/evaluations", icon: <Star className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/supervisor/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "التقييمات", href: "/supervisor/grades", icon: <Award className="w-5 h-5" /> },
  { title: "النقاشات", href: "/supervisor/discussions", icon: <MessageCircle className="w-5 h-5" /> },
]

interface Student {
  id: string
  name: string
  email: string
  projectId: string
  projectTitle?: string
}

interface Grade {
  id: string
  studentId: string
  studentName: string
  projectId: string
  category: string
  title: string
  score: number
  maxScore: number
  weight: number
  feedback: string
  gradedBy: string
  gradedByName: string
  gradedAt: any
}

export default function SupervisorGrades() {
  const { userData, loading: authLoading } = useAuth()
  const [students, setStudents] = useState<Student[]>([])
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null)
  const [formData, setFormData] = useState({
    studentId: "",
    category: "",
    title: "",
    score: "",
    maxScore: "",
    weight: "",
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

      // Fetch students under this supervisor
      const studentsQuery = query(collection(db, "users"), where("supervisorId", "==", userData.uid))
      const studentsSnapshot = await getDocs(studentsQuery)
      const studentsData = studentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Student[]

      // Fetch projects to get titles
      const projectsQuery = query(collection(db, "projects"), where("supervisorId", "==", userData.uid))
      const projectsSnapshot = await getDocs(projectsQuery)
      const projects = new Map(projectsSnapshot.docs.map((doc) => [doc.id, doc.data().title]))

      // Add project titles to students
      studentsData.forEach((student) => {
        if (student.projectId) {
          student.projectTitle = projects.get(student.projectId)
        }
      })

      setStudents(studentsData)

      // Fetch all grades for these students
      const studentIds = studentsData.map((s) => s.id)
      if (studentIds.length > 0) {
        const gradesQuery = query(collection(db, "grades"), where("gradedBy", "==", userData.uid))
        const gradesSnapshot = await getDocs(gradesQuery)
        const gradesData = gradesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Grade[]
        setGrades(gradesData)
      }
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast.error("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.studentId ||
      !formData.category ||
      !formData.title ||
      !formData.score ||
      !formData.maxScore ||
      !formData.weight
    ) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    const score = Number.parseFloat(formData.score)
    const maxScore = Number.parseFloat(formData.maxScore)
    const weight = Number.parseFloat(formData.weight)

    if (score > maxScore) {
      toast.error("الدرجة لا يمكن أن تكون أكبر من الدرجة القصوى")
      return
    }

    try {
      const db = getFirebaseDb()
      const student = students.find((s) => s.id === formData.studentId)

      if (!student) {
        toast.error("الطالب غير موجود")
        return
      }

      const gradeData = {
        studentId: formData.studentId,
        studentName: student.name,
        projectId: student.projectId,
        category: formData.category,
        title: formData.title,
        score,
        maxScore,
        weight,
        feedback: formData.feedback,
        gradedBy: userData?.uid,
        gradedByName: userData?.name,
        gradedAt: Timestamp.now(),
      }

      if (editingGrade) {
        await updateDoc(doc(db, "grades", editingGrade.id), gradeData)

        await createNotification({
          userId: formData.studentId,
          title: "تحديث تقييم",
          message: `تم تحديث تقييم ${formData.title} - الدرجة: ${score}/${maxScore}`,
          type: "grade",
        })

        toast.success("تم تحديث التقييم بنجاح")
      } else {
        await addDoc(collection(db, "grades"), gradeData)

        await createNotification({
          userId: formData.studentId,
          title: "تقييم جديد",
          message: `تم إضافة تقييم جديد: ${formData.title} - الدرجة: ${score}/${maxScore}`,
          type: "grade",
        })

        toast.success("تم إضافة التقييم بنجاح")
      }

      setDialogOpen(false)
      setEditingGrade(null)
      setFormData({
        studentId: "",
        category: "",
        title: "",
        score: "",
        maxScore: "",
        weight: "",
        feedback: "",
      })
      fetchData()
    } catch (error) {
      console.error("[v0] Error saving grade:", error)
      toast.error("حدث خطأ أثناء حفظ التقييم")
    }
  }

  const handleEdit = (grade: Grade) => {
    setEditingGrade(grade)
    setFormData({
      studentId: grade.studentId,
      category: grade.category,
      title: grade.title,
      score: grade.score.toString(),
      maxScore: grade.maxScore.toString(),
      weight: grade.weight.toString(),
      feedback: grade.feedback,
    })
    setDialogOpen(true)
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "غير محدد"
    return timestamp.toDate().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStudentGrades = (studentId: string) => {
    return grades.filter((g) => g.studentId === studentId)
  }

  const calculateStudentAverage = (studentId: string) => {
    const studentGrades = getStudentGrades(studentId)
    if (studentGrades.length === 0) return 0

    const totalScore = studentGrades.reduce((sum, g) => sum + g.score, 0)
    const maxTotalScore = studentGrades.reduce((sum, g) => sum + g.maxScore, 0)

    return maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="supervisor">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Award className="w-8 h-8 text-primary" />
              </div>
              إدارة التقييمات
            </h1>
            <p className="text-muted-foreground mt-2">تقييم أداء الطلاب في مراحل المشروع</p>
          </div>

          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) {
                setEditingGrade(null)
                setFormData({
                  studentId: "",
                  category: "",
                  title: "",
                  score: "",
                  maxScore: "",
                  weight: "",
                  feedback: "",
                })
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                تقييم جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingGrade ? "تعديل التقييم" : "إضافة تقييم جديد"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student">الطالب *</Label>
                  <Select
                    value={formData.studentId}
                    onValueChange={(value) => setFormData({ ...formData, studentId: value })}
                    disabled={!!editingGrade}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">الفئة *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الفئة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proposal">المقترح</SelectItem>
                        <SelectItem value="report">التقرير</SelectItem>
                        <SelectItem value="presentation">العرض التقديمي</SelectItem>
                        <SelectItem value="progress">التقدم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">عنوان التقييم *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="مثال: التقرير النهائي"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="score">الدرجة *</Label>
                    <Input
                      id="score"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.score}
                      onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                      placeholder="0"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxScore">الدرجة القصوى *</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                      placeholder="100"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">الوزن (%) *</Label>
                    <Input
                      id="weight"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                      placeholder="20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">الملاحظات</Label>
                  <Textarea
                    id="feedback"
                    value={formData.feedback}
                    onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                    placeholder="أضف ملاحظاتك وتوجيهاتك للطالب"
                    rows={4}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false)
                      setEditingGrade(null)
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit">{editingGrade ? "تحديث" : "إضافة"} التقييم</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
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
              <p className="text-sm text-muted-foreground text-center max-w-md">لا يوجد طلاب مسجلين تحت إشرافك حالياً</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {students.map((student, index) => {
              const studentGrades = getStudentGrades(student.id)
              const average = calculateStudentAverage(student.id)

              return (
                <Card
                  key={student.id}
                  className="animate-in fade-in slide-in-from-bottom duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {student.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>{student.name}</CardTitle>
                          <CardDescription>{student.projectTitle || "بدون مشروع"}</CardDescription>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-2xl font-bold text-primary">{average}%</div>
                        <p className="text-xs text-muted-foreground">{studentGrades.length} تقييم</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {studentGrades.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>لم يتم إضافة تقييمات لهذا الطالب بعد</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {studentGrades.map((grade) => {
                          const percentage = (grade.score / grade.maxScore) * 100
                          return (
                            <div
                              key={grade.id}
                              className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{grade.title}</p>
                                  <Badge variant="secondary" className="text-xs">
                                    {grade.category === "proposal"
                                      ? "المقترح"
                                      : grade.category === "report"
                                        ? "التقرير"
                                        : grade.category === "presentation"
                                          ? "العرض"
                                          : "التقدم"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{formatDate(grade.gradedAt)}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-left">
                                  <div className="font-semibold">
                                    {grade.score} / {grade.maxScore}
                                  </div>
                                  <div className="text-xs text-muted-foreground">{Math.round(percentage)}%</div>
                                </div>
                                <Button size="icon" variant="ghost" onClick={() => handleEdit(grade)}>
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
