"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/contexts/auth-context"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Home,
  FolderKanban,
  CheckSquare,
  Calendar,
  FileText,
  Bell,
  User,
  Mail,
  BookOpen,
  Award,
  Edit,
  Phone,
  MapPin,
} from "lucide-react"
import { getDocument, getDocuments, updateDocument } from "@/lib/firebase/db"
import { formatDate } from "@/lib/utils/date-helpers"
import { where } from "firebase/firestore"
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

export default function ProfilePage() {
  const { userData, loading } = useAuth()
  const [projectData, setProjectData] = useState<any>(null)
  const [supervisorData, setSupervisorData] = useState<any>(null)
  const [stats, setStats] = useState({
    completedTasks: 0,
    totalTasks: 0,
    meetings: 0,
    filesUploaded: 0,
  })
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editData, setEditData] = useState({
    phone: "",
    address: "",
    bio: "",
  })

  useEffect(() => {
    if (userData) {
      if (userData.projectId) {
        fetchProjectData()
      }
      if (userData.supervisorId) {
        fetchSupervisorData()
      }
      fetchStats()

      setEditData({
        phone: userData.phone || "",
        address: userData.address || "",
        bio: userData.bio || "",
      })
    }
  }, [userData])

  const fetchProjectData = async () => {
    if (!userData?.projectId) return
    try {
      const project = await getDocument("projects", userData.projectId)
      setProjectData(project)
    } catch (error) {
      console.error("Error fetching project:", error)
    }
  }

  const fetchSupervisorData = async () => {
    if (!userData?.supervisorId) return
    try {
      const supervisor = await getDocument("users", userData.supervisorId)
      setSupervisorData(supervisor)
    } catch (error) {
      console.error("Error fetching supervisor:", error)
    }
  }

  const fetchStats = async () => {
    if (!userData?.uid) return

    try {
      const tasks = await getDocuments("tasks", [where("studentId", "==", userData.uid)])
      const completedTasks = tasks.filter((task: any) => task.status === "completed").length

      const meetings = await getDocuments("meetings", [where("studentId", "==", userData.uid)])

      const files = await getDocuments("files", [where("uploadedBy", "==", userData.uid)])

      setStats({
        completedTasks,
        totalTasks: tasks.length,
        meetings: meetings.length,
        filesUploaded: files.length,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleUpdateProfile = async () => {
    if (!userData?.uid) return

    try {
      await updateDocument("users", userData.uid, editData)
      toast.success("تم تحديث الملف الشخصي بنجاح")
      setIsEditOpen(false)
      window.location.reload()
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("حدث خطأ أثناء تحديث الملف الشخصي")
    }
  }

  if (!userData) {
    return null
  }

  const initials = userData.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in duration-500">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            الملف الشخصي
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">معلوماتك الشخصية وإحصائياتك</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <Avatar className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 ring-4 ring-primary/10">
                <AvatarFallback className="text-xl md:text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg md:text-xl">{userData.name}</CardTitle>
              <CardDescription>
                <Badge variant="secondary" className="mt-2">
                  {userData.role === "student" ? "طالب" : userData.role === "supervisor" ? "مشرف" : "منسق"}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-accent transition-colors">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground truncate">{userData.email}</span>
              </div>
              {userData.studentId && (
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-accent transition-colors">
                  <User className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">الرقم الجامعي: {userData.studentId}</span>
                </div>
              )}
              {userData.department && (
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-accent transition-colors">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">القسم: {userData.department}</span>
                </div>
              )}
              {userData.phone && (
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-accent transition-colors">
                  <Phone className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{userData.phone}</span>
                </div>
              )}
              {userData.address && (
                <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-accent transition-colors">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">{userData.address}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-accent transition-colors">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">انضم: {formatDate(userData.createdAt)}</span>
              </div>

              <Separator />

              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-transparent" variant="outline">
                    <Edit className="w-4 h-4 ml-2" />
                    تعديل الملف الشخصي
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>تعديل الملف الشخصي</DialogTitle>
                    <DialogDescription>قم بتحديث معلوماتك الشخصية</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف</Label>
                      <Input
                        id="phone"
                        placeholder="05xxxxxxxx"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">العنوان</Label>
                      <Input
                        id="address"
                        placeholder="المدينة، الحي"
                        value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">نبذة عنك</Label>
                      <Input
                        id="bio"
                        placeholder="أخبرنا عن نفسك"
                        value={editData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                      إلغاء
                    </Button>
                    <Button onClick={handleUpdateProfile}>حفظ التغييرات</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <div className="md:col-span-2 space-y-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>الإحصائيات</CardTitle>
                <CardDescription>ملخص نشاطك في المنصة</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-900 dark:text-green-100">المهام المكتملة</span>
                      <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-green-700 dark:text-green-300">
                      {stats.completedTasks}/{stats.totalTasks}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% مكتمل
                    </p>
                  </div>

                  <div className="p-4 border rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">الاجتماعات</span>
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.meetings}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">اجتماع حتى الآن</p>
                  </div>

                  <div className="p-4 border rounded-xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-100">الملفات المرفوعة</span>
                      <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-purple-700 dark:text-purple-300">
                      {stats.filesUploaded}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">ملف</p>
                  </div>

                  <div className="p-4 border rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-amber-900 dark:text-amber-100">التقدم العام</span>
                      <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-2xl md:text-3xl font-bold text-amber-700 dark:text-amber-300">
                      {projectData?.progress || 0}%
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">من المشروع</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {supervisorData && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>المشرف الأكاديمي</CardTitle>
                  <CardDescription>معلومات مشرف المشروع</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Avatar className="w-12 h-12 ring-2 ring-primary/10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                        {supervisorData.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="font-semibold text-lg">{supervisorData.name}</p>
                        <p className="text-sm text-muted-foreground">{supervisorData.department}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        <span>{supervisorData.email}</span>
                      </div>
                      {supervisorData.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{supervisorData.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {projectData && (
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>معلومات المشروع</CardTitle>
                  <CardDescription>تفاصيل مشروع التخرج الخاص بك</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">عنوان المشروع</Label>
                    <p className="font-medium mt-1 text-lg">{projectData.title}</p>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-muted-foreground">الوصف</Label>
                    <p className="mt-1 text-sm leading-relaxed">{projectData.description}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">الحالة</Label>
                      <p className="mt-1">
                        <Badge
                          variant={
                            projectData.status === "approved"
                              ? "default"
                              : projectData.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                          className="text-xs"
                        >
                          {projectData.status === "approved"
                            ? "معتمد"
                            : projectData.status === "pending"
                              ? "قيد المراجعة"
                              : "مرفوض"}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">تاريخ البدء</Label>
                      <p className="mt-1 text-sm">{formatDate(projectData.startDate)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
