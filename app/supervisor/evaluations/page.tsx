"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, Users, Star, Calendar, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createNotification } from "@/lib/firebase/notifications"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/supervisor/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "المشاريع", href: "/supervisor/projects", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "الطلاب", href: "/supervisor/students", icon: <Users className="w-5 h-5" /> },
  { title: "التقييمات", href: "/supervisor/evaluations", icon: <Star className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/supervisor/meetings", icon: <Calendar className="w-5 h-5" /> },
]

export default function SupervisorEvaluations() {
  const { userData, loading: authLoading } = useAuth()
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    studentId: "",
    projectId: "",
    category: "",
    score: "",
    feedback: "",
  })

  const fetchData = async () => {
    if (!userData?.uid) return

    try {
      // Fetch evaluations
      const evaluationsQuery = query(collection(db, "evaluations"), where("supervisorId", "==", userData.uid))
      const evaluationsSnapshot = await getDocs(evaluationsQuery)
      const evaluationsData = evaluationsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setEvaluations(evaluationsData)

      // Fetch students
      const projectsQuery = query(collection(db, "projects"), where("supervisorId", "==", userData.uid))
      const projectsSnapshot = await getDocs(projectsQuery)
      const studentIds = projectsSnapshot.docs.map((doc) => doc.data().studentId).filter(Boolean)

      if (studentIds.length > 0) {
        const studentsQuery = query(collection(db, "users"), where("role", "==", "student"))
        const studentsSnapshot = await getDocs(studentsQuery)
        const studentsData = studentsSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((student) => studentIds.includes(student.id))
        setStudents(studentsData)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("حدث خطأ في تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && userData) {
      fetchData()
    }
  }, [userData, authLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.studentId || !formData.category || !formData.score) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة")
      return
    }

    try {
      const student = students.find((s) => s.id === formData.studentId)

      await addDoc(collection(db, "evaluations"), {
        studentId: formData.studentId,
        studentName: student?.name || "",
        supervisorId: userData?.uid,
        supervisorName: userData?.name || "",
        category: formData.category,
        score: Number.parseInt(formData.score),
        feedback: formData.feedback,
        createdAt: Timestamp.now(),
      })

      await createNotification({
        userId: formData.studentId,
        title: "تقييم جديد",
        message: `تم إضافة تقييم جديد لك في ${
          formData.category === "research"
            ? "البحث والتحليل"
            : formData.category === "implementation"
              ? "التنفيذ"
              : formData.category === "documentation"
                ? "التوثيق"
                : formData.category === "presentation"
                  ? "العرض والتقديم"
                  : "العمل الجماعي"
        }`,
        type: "evaluation",
      })

      toast.success("تم إضافة التقييم بنجاح")
      setOpen(false)
      setFormData({ studentId: "", projectId: "", category: "", score: "", feedback: "" })
      fetchData()
    } catch (error) {
      console.error("Error adding evaluation:", error)
      toast.error("حدث خطأ في إضافة التقييم")
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} requiredRole="supervisor">
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
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="supervisor">
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">التقييمات</h1>
            <p className="text-muted-foreground mt-2">تقييم أداء الطلاب والمشاريع</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 ml-2" />
                إضافة تقييم
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إضافة تقييم جديد</DialogTitle>
                <DialogDescription>قم بتقييم أداء الطالب في المشروع</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student">الطالب *</Label>
                  <Select
                    value={formData.studentId}
                    onValueChange={(value) => setFormData({ ...formData, studentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الطالب" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">فئة التقييم *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفئة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="research">البحث والتحليل</SelectItem>
                      <SelectItem value="implementation">التنفيذ</SelectItem>
                      <SelectItem value="documentation">التوثيق</SelectItem>
                      <SelectItem value="presentation">العرض والتقديم</SelectItem>
                      <SelectItem value="teamwork">العمل الجماعي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="score">الدرجة (من 100) *</Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.score}
                    onChange={(e) => setFormData({ ...formData, score: e.target.value })}
                    placeholder="أدخل الدرجة"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">الملاحظات</Label>
                  <Textarea
                    id="feedback"
                    value={formData.feedback}
                    onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
                    placeholder="أضف ملاحظاتك هنا..."
                    rows={4}
                  />
                </div>

                <Button type="submit" className="w-full">
                  حفظ التقييم
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {evaluations.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Star className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">لا توجد تقييمات حالياً</h3>
                  <p className="text-sm text-muted-foreground mt-2">ابدأ بإضافة تقييمات للطلاب</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {evaluations.map((evaluation) => (
              <Card key={evaluation.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{evaluation.studentName}</CardTitle>
                      <CardDescription className="mt-1">
                        {evaluation.category === "research"
                          ? "البحث والتحليل"
                          : evaluation.category === "implementation"
                            ? "التنفيذ"
                            : evaluation.category === "documentation"
                              ? "التوثيق"
                              : evaluation.category === "presentation"
                                ? "العرض والتقديم"
                                : "العمل الجماعي"}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        evaluation.score >= 85 ? "default" : evaluation.score >= 70 ? "secondary" : "destructive"
                      }
                    >
                      {evaluation.score}/100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {evaluation.feedback && (
                    <div>
                      <p className="text-sm font-medium mb-1">الملاحظات:</p>
                      <p className="text-sm text-muted-foreground">{evaluation.feedback}</p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {evaluation.createdAt && new Date(evaluation.createdAt.seconds * 1000).toLocaleDateString("ar-EG")}
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
