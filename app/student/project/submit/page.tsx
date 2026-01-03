"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, CheckSquare, Calendar, FileText, Bell, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/contexts/auth-context"
import { useState } from "react"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "الملف الشخصي", href: "/student/profile", icon: <User className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
]

export default function SubmitProjectIdea() {
  const { userData } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    objectives: "",
    technologies: "",
    projectType: "",
    department: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userData) return

    setLoading(true)
    try {
      const db = getFirebaseDb()
      const objectivesArray = formData.objectives.split("\n").filter((obj) => obj.trim())
      const technologiesArray = formData.technologies
        .split(",")
        .map((tech) => tech.trim())
        .filter((tech) => tech)

      await addDoc(collection(db, "projectIdeas"), {
        title: formData.title,
        description: formData.description,
        objectives: objectivesArray,
        technologies: technologiesArray,
        projectType: formData.projectType,
        department: formData.department,
        studentId: userData.uid,
        studentName: userData.name,
        studentEmail: userData.email,
        status: "pending",
        submittedAt: Timestamp.now(),
      })

      toast.success("تم تقديم فكرة المشروع بنجاح!")
      router.push("/student/project")
    } catch (error) {
      console.error("Error submitting project idea:", error)
      toast.error("حدث خطأ أثناء تقديم فكرة المشروع")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">تقديم فكرة مشروع</h1>
          <p className="text-muted-foreground mt-2">قدم فكرة مشروع التخرج الخاص بك للمراجعة</p>
        </div>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>معلومات المشروع</CardTitle>
            <CardDescription>املأ جميع الحقول المطلوبة لتقديم فكرة مشروعك</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">عنوان المشروع *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">وصف المشروع *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  className="rounded-lg"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectives">أهداف المشروع *</Label>
                <Textarea
                  id="objectives"
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  rows={4}
                  className="rounded-lg"
                  required
                />
                <p className="text-xs text-muted-foreground">اكتب كل هدف في سطر منفصل</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technologies">التقنيات المستخدمة *</Label>
                <Input
                  id="technologies"
                  value={formData.technologies}
                  onChange={(e) => setFormData({ ...formData, technologies: e.target.value })}
                  className="rounded-lg"
                  required
                />
                <p className="text-xs text-muted-foreground">افصل بين التقنيات بفاصلة</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectType">خيار المشروع *</Label>
                <Select
                  value={formData.projectType}
                  onValueChange={(value) => setFormData({ ...formData, projectType: value })}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="اختر خيار المشروع" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="one-course">كورس واحد</SelectItem>
                    <SelectItem value="two-courses">كورسين</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">القسم *</Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger className="rounded-lg">
                    <SelectValue placeholder="اختر القسم" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="cs">علوم الحاسب</SelectItem>
                    <SelectItem value="it">تقنية المعلومات</SelectItem>
                    <SelectItem value="is">نظم المعلومات</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={loading} className="rounded-lg">
                  {loading ? "جاري التقديم..." : "تقديم الفكرة"}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-lg">
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
