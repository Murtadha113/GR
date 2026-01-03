"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, CheckSquare, Calendar, FileText, Bell, User, Plus, Clock, MapPin } from "lucide-react"
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "الملف الشخصي", href: "/student/profile", icon: <User className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
]

export default function StudentMeetings() {
  const { userData, loading: authLoading } = useAuth()
  const [meetings, setMeetings] = useState<any[]>([])
  const [meetingRequests, setMeetingRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [requestData, setRequestData] = useState({
    title: "",
    notes: "",
    date: "",
    time: "",
    department: "",
  })

  const fetchMeetings = async () => {
    if (!userData?.uid) return

    try {
      const db = getFirebaseDb()
      const meetingsQuery = query(collection(db, "meetings"), where("studentId", "==", userData.uid))
      const meetingsSnapshot = await getDocs(meetingsQuery)
      const meetingsData = meetingsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setMeetings(meetingsData.sort((a, b) => b.date.seconds - a.date.seconds))

      const requestsQuery = query(collection(db, "meeting_requests"), where("studentId", "==", userData.uid))
      const requestsSnapshot = await getDocs(requestsQuery)
      const requestsData = requestsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setMeetingRequests(requestsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds))
    } catch (error) {
      console.error("Error fetching meetings:", error)
      toast.error("حدث خطأ أثناء تحميل الاجتماعات")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeetings()
  }, [userData])

  const handleRequestMeeting = async () => {
    if (!userData?.uid || !userData?.projectId) {
      toast.error("لا يمكن إرسال الطلب. تأكد من أن لديك مشروع مسجل")
      return
    }

    if (!requestData.title || !requestData.date || !requestData.time || !requestData.department) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      const db = getFirebaseDb()
      await addDoc(collection(db, "meeting_requests"), {
        studentId: userData.uid,
        studentName: userData.name,
        projectId: userData.projectId,
        supervisorId: userData.supervisorId,
        title: requestData.title,
        notes: requestData.notes,
        date: requestData.date,
        time: requestData.time,
        department: requestData.department,
        status: "pending",
        createdAt: Timestamp.now(),
      })

      toast.success("تم إرسال طلب الاجتماع بنجاح")
      setIsDialogOpen(false)
      setRequestData({ title: "", notes: "", date: "", time: "", department: "" })
      fetchMeetings()
    } catch (error) {
      console.error("Error requesting meeting:", error)
      toast.error("حدث خطأ أثناء إرسال الطلب")
    }
  }

  const currentYear = new Date().getFullYear()

  if (authLoading) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
        <div className="p-4 md:p-8">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              الاجتماعات
            </h1>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">جدول الاجتماعات مع المشرف</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 rounded-lg">
                <Plus className="w-4 h-4 ml-2" />
                طلب اجتماع
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-xl">
              <DialogHeader>
                <DialogTitle className="text-xl">طلب اجتماع جديد</DialogTitle>
                <DialogDescription>أرسل طلب اجتماع إلى المشرف</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    عنوان الاجتماع <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="مثال: مناقشة تقدم المشروع"
                    value={requestData.title}
                    onChange={(e) => setRequestData({ ...requestData, title: e.target.value })}
                    className="h-11 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium">
                    ملاحظة
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="أضف أي ملاحظات إضافية..."
                    value={requestData.notes}
                    onChange={(e) => setRequestData({ ...requestData, notes: e.target.value })}
                    className="min-h-[100px] resize-none rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium">
                      التاريخ <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      min={`${currentYear}-01-01`}
                      value={requestData.date}
                      onChange={(e) => setRequestData({ ...requestData, date: e.target.value })}
                      className="h-11 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time" className="text-sm font-medium">
                      الوقت <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={requestData.time}
                      onChange={(e) => setRequestData({ ...requestData, time: e.target.value })}
                      className="h-11 rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium">
                    القسم <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={requestData.department}
                    onValueChange={(value) => setRequestData({ ...requestData, department: value })}
                  >
                    <SelectTrigger className="h-11 rounded-lg">
                      <SelectValue placeholder="اختر القسم" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="cs">علوم الحاسب</SelectItem>
                      <SelectItem value="it">تقنية المعلومات</SelectItem>
                      <SelectItem value="is">نظم المعلومات</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1 sm:flex-none rounded-lg"
                >
                  إلغاء
                </Button>
                <Button onClick={handleRequestMeeting} className="flex-1 sm:flex-none rounded-lg">
                  إرسال الطلب
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="scheduled" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 rounded-lg">
            <TabsTrigger value="scheduled" className="gap-2 rounded-lg">
              <Calendar className="w-4 h-4" />
              الاجتماعات المجدولة
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 rounded-lg">
              <Clock className="w-4 h-4" />
              طلباتي ({meetingRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scheduled" className="space-y-4">
            {loading ? (
              <Card className="rounded-xl">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            ) : meetings.length === 0 ? (
              <Card className="border-dashed rounded-xl">
                <CardContent className="p-8 md:p-12">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">لا توجد اجتماعات مجدولة</h3>
                      <p className="text-sm text-muted-foreground mt-2">سيتم إضافة الاجتماعات من قبل المشرف</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {meetings.map((meeting, index) => (
                  <Card
                    key={meeting.id}
                    className="hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom rounded-xl"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-lg md:text-xl">{meeting.title}</CardTitle>
                          {meeting.notes && <CardDescription className="mt-2">{meeting.notes}</CardDescription>}
                        </div>
                        <Badge
                          variant={
                            meeting.status === "scheduled"
                              ? "default"
                              : meeting.status === "completed"
                                ? "secondary"
                                : "destructive"
                          }
                          className="shrink-0 rounded-lg"
                        >
                          {meeting.status === "scheduled" ? "مجدول" : meeting.status === "completed" ? "مكتمل" : "ملغي"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">التاريخ</p>
                            <p className="text-sm mt-1 font-medium">
                              {new Date(meeting.date.seconds * 1000).toLocaleDateString("ar-SA", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                            <Clock className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">الوقت</p>
                            <p className="text-sm mt-1 font-medium">{meeting.time}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">المكان</p>
                            <p className="text-sm mt-1 font-medium">{meeting.location || "غير محدد"}</p>
                          </div>
                        </div>
                      </div>
                      {meeting.notes && (
                        <div className="mt-4 p-4 rounded-lg bg-muted/50">
                          <p className="text-sm font-medium text-muted-foreground mb-1">ملاحظات</p>
                          <p className="text-sm">{meeting.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            {loading ? (
              <Card className="rounded-xl">
                <CardContent className="p-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </CardContent>
              </Card>
            ) : meetingRequests.length === 0 ? (
              <Card className="border-dashed rounded-xl">
                <CardContent className="p-8 md:p-12">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">لا توجد طلبات اجتماع</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        يمكنك إرسال طلب اجتماع جديد باستخدام الزر أعلاه
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {meetingRequests.map((request, index) => (
                  <Card
                    key={request.id}
                    className="hover:shadow-lg transition-all duration-300 animate-in slide-in-from-bottom rounded-xl"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-lg md:text-xl">{request.title}</CardTitle>
                          {request.notes && <CardDescription className="mt-2">{request.notes}</CardDescription>}
                        </div>
                        <Badge
                          variant={
                            request.status === "pending"
                              ? "secondary"
                              : request.status === "approved"
                                ? "default"
                                : "destructive"
                          }
                          className="shrink-0 rounded-lg"
                        >
                          {request.status === "pending"
                            ? "قيد المراجعة"
                            : request.status === "approved"
                              ? "تمت الموافقة"
                              : "مرفوض"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">التاريخ</p>
                            <p className="text-sm mt-1 font-medium">
                              {new Date(request.date).toLocaleDateString("ar-SA")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 p-2 rounded-lg bg-primary/10">
                            <Clock className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">الوقت</p>
                            <p className="text-sm mt-1 font-medium">{request.time}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                        تم الإرسال: {new Date(request.createdAt.seconds * 1000).toLocaleDateString("ar-SA")}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
