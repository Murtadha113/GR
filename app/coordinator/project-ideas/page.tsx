"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, Users, FileText, Archive, Lightbulb } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/coordinator/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "جميع المشاريع", href: "/coordinator/projects", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "أفكار المشاريع", href: "/coordinator/project-ideas", icon: <Lightbulb className="w-5 h-5" /> },
  { title: "المشرفين", href: "/coordinator/supervisors", icon: <Users className="w-5 h-5" /> },
  { title: "التقارير", href: "/coordinator/reports", icon: <FileText className="w-5 h-5" /> },
  { title: "الأرشيف", href: "/coordinator/archive", icon: <Archive className="w-5 h-5" /> },
]

export default function ProjectIdeas() {
  const [ideas, setIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdea, setSelectedIdea] = useState<any>(null)
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [selectedSupervisor, setSelectedSupervisor] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [ideasSnapshot, supervisorsSnapshot] = await Promise.all([
        getDocs(collection(db, "projectIdeas")),
        getDocs(collection(db, "users")),
      ])

      const ideasData = ideasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      const supervisorsData = supervisorsSnapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user: any) => user.role === "supervisor")

      setIdeas(ideasData)
      setSupervisors(supervisorsData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast.error("حدث خطأ أثناء تحميل البيانات")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (idea: any) => {
    if (!selectedSupervisor) {
      toast.error("يرجى اختيار مشرف للمشروع")
      return
    }

    try {
      // Create project
      const projectRef = await addDoc(collection(db, "projects"), {
        title: idea.title,
        description: idea.description,
        objectives: idea.objectives,
        technologies: idea.technologies,
        studentId: idea.studentId,
        studentName: idea.studentName,
        supervisorId: selectedSupervisor,
        supervisorName: supervisors.find((s) => s.id === selectedSupervisor)?.name,
        status: "active",
        progress: 0,
        startDate: Timestamp.now(),
        createdAt: Timestamp.now(),
      })

      // Update idea status
      await updateDoc(doc(db, "projectIdeas", idea.id), {
        status: "approved",
        approvedAt: Timestamp.now(),
        projectId: projectRef.id,
      })

      // Update student with project ID
      await updateDoc(doc(db, "users", idea.studentId), {
        projectId: projectRef.id,
        supervisorId: selectedSupervisor,
      })

      toast.success("تم قبول المشروع وتعيين المشرف بنجاح!")
      fetchData()
      setSelectedIdea(null)
      setSelectedSupervisor("")
    } catch (error) {
      console.error("Error approving project:", error)
      toast.error("حدث خطأ أثناء قبول المشروع")
    }
  }

  const handleReject = async (ideaId: string) => {
    try {
      await updateDoc(doc(db, "projectIdeas", ideaId), {
        status: "rejected",
        rejectedAt: Timestamp.now(),
      })

      toast.success("تم رفض المشروع")
      fetchData()
    } catch (error) {
      console.error("Error rejecting project:", error)
      toast.error("حدث خطأ أثناء رفض المشروع")
    }
  }

  const pendingIdeas = ideas.filter((idea) => idea.status === "pending")
  const approvedIdeas = ideas.filter((idea) => idea.status === "approved")
  const rejectedIdeas = ideas.filter((idea) => idea.status === "rejected")

  const IdeaCard = ({ idea }: { idea: any }) => (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{idea.title}</CardTitle>
            <CardDescription className="mt-2">{idea.description}</CardDescription>
          </div>
          <Badge
            variant={idea.status === "approved" ? "default" : idea.status === "rejected" ? "destructive" : "secondary"}
          >
            {idea.status === "approved" ? "مقبول" : idea.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">الأهداف:</p>
          <ul className="space-y-1">
            {idea.objectives?.map((obj: string, index: number) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span>•</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">التقنيات:</p>
          <div className="flex flex-wrap gap-2">
            {idea.technologies?.map((tech: string, index: number) => (
              <Badge key={index} variant="outline">
                {tech}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الطالب:</span>
            <span>{idea.studentName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المدة المتوقعة:</span>
            <span>{idea.expectedDuration}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تاريخ التقديم:</span>
            <span>
              {idea.submittedAt ? new Date(idea.submittedAt.seconds * 1000).toLocaleDateString("ar-SA") : "-"}
            </span>
          </div>
        </div>

        {idea.status === "pending" && (
          <div className="flex gap-2 pt-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button onClick={() => setSelectedIdea(idea)} className="flex-1">
                  قبول
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>قبول المشروع وتعيين مشرف</DialogTitle>
                  <DialogDescription>اختر مشرفاً للمشروع: {idea.title}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>المشرف</Label>
                    <select
                      className="w-full p-2 border rounded-md"
                      value={selectedSupervisor}
                      onChange={(e) => setSelectedSupervisor(e.target.value)}
                    >
                      <option value="">اختر مشرفاً</option>
                      {supervisors.map((supervisor) => (
                        <option key={supervisor.id} value={supervisor.id}>
                          {supervisor.name} - {supervisor.department}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={() => handleApprove(idea)} className="w-full">
                    تأكيد القبول
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="destructive" onClick={() => handleReject(idea.id)} className="flex-1">
              رفض
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">أفكار المشاريع</h1>
          <p className="text-muted-foreground mt-2">مراجعة وقبول أو رفض أفكار مشاريع الطلاب</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : ideas.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">لا توجد أفكار مشاريع</h3>
                  <p className="text-sm text-muted-foreground mt-2">لم يقدم الطلاب أي أفكار بعد</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList>
              <TabsTrigger value="pending">قيد المراجعة ({pendingIdeas.length})</TabsTrigger>
              <TabsTrigger value="approved">مقبولة ({approvedIdeas.length})</TabsTrigger>
              <TabsTrigger value="rejected">مرفوضة ({rejectedIdeas.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="grid gap-6 md:grid-cols-2">
              {pendingIdeas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 col-span-2">لا توجد أفكار قيد المراجعة</p>
              ) : (
                pendingIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
              )}
            </TabsContent>

            <TabsContent value="approved" className="grid gap-6 md:grid-cols-2">
              {approvedIdeas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 col-span-2">لا توجد أفكار مقبولة</p>
              ) : (
                approvedIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
              )}
            </TabsContent>

            <TabsContent value="rejected" className="grid gap-6 md:grid-cols-2">
              {rejectedIdeas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 col-span-2">لا توجد أفكار مرفوضة</p>
              ) : (
                rejectedIdeas.map((idea) => <IdeaCard key={idea.id} idea={idea} />)
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  )
}
