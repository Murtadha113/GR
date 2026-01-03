"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, Users, Star, Calendar, Plus, Clock, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
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

const sidebarItems = [
  { title: "لوحة التحكم", href: "/supervisor/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "المشاريع", href: "/supervisor/projects", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "الطلاب", href: "/supervisor/students", icon: <Users className="w-5 h-5" /> },
  { title: "التقييمات", href: "/supervisor/evaluations", icon: <Star className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/supervisor/meetings", icon: <Calendar className="w-5 h-5" /> },
]

export default function SupervisorMeetings() {
  const { userData, loading: authLoading } = useAuth()
  const [meetings, setMeetings] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    studentId: "",
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
  })

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

      const db = getFirebaseDb()
      if (!db) {
        throw new Error("قاعدة البيانات غير متاحة")
      }

      // Fetch meetings
      const meetingsQuery = query(collection(db, "meetings"), where("supervisorId", "==", userData.uid))
      const meetingsSnapshot = await getDocs(meetingsQuery)
      const meetingsData = meetingsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      const sortedMeetings = meetingsData.sort((a: any, b: any) => {
        const dateA = a.date?.seconds || 0
        const dateB = b.date?.seconds || 0
        return dateB - dateA
      })

      setMeetings(sortedMeetings)

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
      } else {
        setStudents([])
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("حدث خطأ أثناء تحميل البيانات")
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

    if (!formData.studentId || !formData.title || !formData.date || !formData.time) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة")
      return
    }

    try {
      const db = getFirebaseDb()
      if (!db) {
        throw new Error("قاعدة البيانات غير متاحة")
      }

      const student = students.find((s) => s.id === formData.studentId)
      const meetingDate = new Date(formData.date)

      await addDoc(collection(db, "meetings"), {
        studentId: formData.studentId,
        studentName: student?.name || "",
        supervisorId: userData?.uid,
        supervisorName: userData?.name || "",
        title: formData.title,
        description: formData.description,
        date: Timestamp.fromDate(meetingDate),
        time: formData.time,
        location: formData.location,
        status: "scheduled",
        createdAt: Timestamp.now(),
      })

      toast.success("تم جدولة الاجتماع بنجاح")
      setOpen(false)
      setFormData({ studentId: "", title: "", description: "", date: "", time: "", location: "" })
      fetchData()
    } catch (error) {
      console.error("Error scheduling meeting:", error)
      toast.error("حدث خطأ في جدولة الاجتماع")
    }
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="supervisor">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-700">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
              الاجتماعات
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">إدارة الاجتماعات مع الطلاب</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                جدولة اجتماع
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
              <DialogHeader>
                <DialogTitle className="text-xl">جدولة اجتماع جديد</DialogTitle>
                <DialogDescription>حدد موعد اجتماع مع أحد الطلاب</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student">الطالب *</Label>
                  <Select
                    value={formData.studentId}
                    onValueChange={(value) => setFormData({ ...formData, studentId: value })}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="اختر الطالب" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">لا يوجد طلاب متاحين</div>
                      ) : (
                        students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">عنوان الاجتماع *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: مناقشة التقدم في المشروع"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">الوصف</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="أضف تفاصيل الاجتماع..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">التاريخ *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">الوقت *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">المكان</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="مثال: مكتب المشرف - الدور الثالث"
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full h-11" disabled={students.length === 0}>
                  جدولة الاجتماع
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {authLoading || loading ? (
          <Card className="animate-pulse">
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive/50 animate-in fade-in duration-500">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center space-y-4">
                <div className="text-destructive">
                  <h3 className="text-lg font-semibold">حدث خطأ</h3>
                  <p className="text-sm mt-2">{error}</p>
                </div>
                <Button onClick={fetchData} variant="outline">
                  إعادة المحاولة
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : meetings.length === 0 ? (
          <Card className="border-dashed animate-in fade-in zoom-in duration-500">
            <CardContent className="p-8 sm:p-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in duration-700 delay-150">
                  <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                </div>
                <div className="animate-in slide-in-from-bottom duration-700 delay-300">
                  <h3 className="text-lg sm:text-xl font-semibold">لا توجد اجتماعات مجدولة</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                    {students.length === 0
                      ? "لا يوجد طلاب مرتبطين بك حالياً. يجب أن يكون لديك طلاب لجدولة اجتماعات."
                      : "ابدأ بجدولة اجتماعات مع الطلاب لمتابعة تقدمهم في المشاريع"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <Card className="bg-gradient-to-l from-primary/10 to-primary/5 border-primary/20 animate-in slide-in-from-right duration-500">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">إجمالي الاجتماعات</p>
                    <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">{meetings.length}</p>
                  </div>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4">
              {meetings.map((meeting, index) => (
                <Card
                  key={meeting.id}
                  className="group hover:shadow-lg transition-all duration-300 hover:scale-[1.01] sm:hover:scale-[1.02] hover:border-primary/50 animate-in fade-in slide-in-from-bottom duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 w-full">
                        <CardTitle className="text-lg sm:text-xl group-hover:text-primary transition-colors">
                          {meeting.title}
                        </CardTitle>
                        {meeting.description && (
                          <CardDescription className="mt-2 line-clamp-2 text-sm">{meeting.description}</CardDescription>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{meeting.studentName}</span>
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          meeting.status === "scheduled"
                            ? "default"
                            : meeting.status === "completed"
                              ? "secondary"
                              : "destructive"
                        }
                        className="shadow-sm self-start"
                      >
                        {meeting.status === "scheduled" ? "مجدول" : meeting.status === "completed" ? "مكتمل" : "ملغي"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0">
                    <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm flex-shrink-0">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">التاريخ</p>
                          <p className="text-sm font-semibold truncate">
                            {meeting.date?.seconds
                              ? new Date(meeting.date.seconds * 1000).toLocaleDateString("ar-SA", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "غير محدد"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm flex-shrink-0">
                          <Clock className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">الوقت</p>
                          <p className="text-sm font-semibold truncate">{meeting.time || "غير محدد"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group-hover:bg-muted transition-colors">
                        <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center shadow-sm flex-shrink-0">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">المكان</p>
                          <p className="text-sm font-semibold truncate">{meeting.location || "غير محدد"}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
