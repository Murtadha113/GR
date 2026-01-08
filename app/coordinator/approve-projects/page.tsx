"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { coordinatorSidebarItems } from "@/lib/constants/coordinator-sidebar"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  query,
  where,
  Timestamp,
} from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Lightbulb, CheckCircle2, XCircle, Eye, Loader2, AlertCircle } from "lucide-react"
import { notifyProjectApproved, notifyProjectRejected } from "@/lib/utils/notification-helper"

export default function ApproveProjects() {
  const [projectIdeas, setProjectIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false)
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [newProject, setNewProject] = useState({
    supervisorId: "",
    startDate: "",
    endDate: "",
  })
  const [rejectionReason, setRejectionReason] = useState("")
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const { userData } = useAuth()

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const ideasSnapshot = await getDocs(collection(getFirebaseDb(), "projectIdeas"))
      const ideasData = ideasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setProjectIdeas(ideasData)
    } catch (error) {
      console.error("Error fetching project ideas:", error)
      toast.error("حدث خطأ في تحميل أفكار المشاريع")
    } finally {
      setLoading(false)
    }
  }

  const fetchSupervisors = async () => {
    try {
      const supervisorsQuery = query(collection(getFirebaseDb(), "users"), where("role", "==", "supervisor"))
      const supervisorsSnapshot = await getDocs(supervisorsQuery)
      setSupervisors(supervisorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    } catch (error) {
      console.error("Error fetching supervisors:", error)
    }
  }

  useEffect(() => {
    fetchProjects()
    fetchSupervisors()
  }, [])

  const handleApproveClick = (project: any) => {
    setSelectedProject(project)
    setNewProject({
      supervisorId: "",
      startDate: "",
      endDate: "",
    })
    setIsCreateProjectDialogOpen(true)
  }

  const handleCreateProject = async () => {
    if (!selectedProject || !newProject.supervisorId || !newProject.startDate) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      setIsApproving(true)
      const db = getFirebaseDb()

      await updateDoc(doc(db, "projectIdeas", selectedProject.id), {
        status: "approved",
        approvedAt: serverTimestamp(),
        approvedBy: userData?.uid,
      })

      const supervisor = supervisors.find((s) => s.id === newProject.supervisorId)

      const projectData: any = {
        title: selectedProject.title,
        description: selectedProject.description,
        supervisorId: newProject.supervisorId,
        supervisorName: supervisor?.name || "",
        studentId: selectedProject.studentId,
        studentName: selectedProject.studentName || "",
        department: selectedProject.department,
        status: "active",
        progress: 0,
        createdAt: Timestamp.now(),
        startDate: Timestamp.fromDate(new Date(newProject.startDate)),
      }

      if (newProject.endDate) {
        projectData.endDate = Timestamp.fromDate(new Date(newProject.endDate))
      }

      const projectRef = await addDoc(collection(db, "projects"), projectData)

      if (selectedProject.studentId) {
        await updateDoc(doc(db, "users", selectedProject.studentId), {
          supervisorId: newProject.supervisorId,
          projectId: projectRef.id,
        })
      }

      await updateDoc(doc(db, "projectIdeas", selectedProject.id), {
        supervisorId: newProject.supervisorId,
        projectId: projectRef.id,
      })

      await notifyProjectApproved(selectedProject.studentId, selectedProject.title, supervisor?.name || "")

      toast.success("تم قبول المشروع وإنشائه بنجاح!")
      setIsCreateProjectDialogOpen(false)
      setSelectedProject(null)
      setNewProject({
        supervisorId: "",
        startDate: "",
        endDate: "",
      })
      fetchProjects()
    } catch (error) {
      console.error("Error creating project:", error)
      toast.error("حدث خطأ أثناء إنشاء المشروع")
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!selectedProject || !rejectionReason.trim()) {
      toast.error("يرجى إدخال سبب الرفض")
      return
    }

    try {
      setIsRejecting(true)
      const db = getFirebaseDb()

      await updateDoc(doc(db, "projectIdeas", selectedProject.id), {
        status: "rejected",
        rejectedAt: serverTimestamp(),
        rejectedBy: userData?.uid,
        rejectionReason: rejectionReason,
      })

      await notifyProjectRejected(selectedProject.studentId, selectedProject.title, rejectionReason)

      toast.success("تم رفض فكرة المشروع")
      setIsRejectDialogOpen(false)
      setSelectedProject(null)
      setRejectionReason("")
      fetchProjects()
    } catch (error) {
      console.error("Error rejecting project:", error)
      toast.error("حدث خطأ أثناء رفض المشروع")
    } finally {
      setIsRejecting(false)
    }
  }

  const pendingProjects = projectIdeas.filter((project) => project.status === "pending")
  const approvedProjects = projectIdeas.filter((project) => project.status === "approved")
  const rejectedProjects = projectIdeas.filter((project) => project.status === "rejected")

  const ProjectCard = ({ project }: { project: any }) => (
    <Card className="rounded-xl hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              {project.title}
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2">{project.description}</CardDescription>
          </div>
          <Badge
            variant={
              project.status === "pending" ? "outline" : project.status === "approved" ? "default" : "destructive"
            }
            className="rounded-lg"
          >
            {project.status === "pending" ? "قيد المراجعة" : project.status === "approved" ? "مقبول" : "مرفوض"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">الطالب:</span>
            <span className="font-medium">{project.studentName || "غير محدد"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">البريد الإلكتروني:</span>
            <span className="font-medium text-xs">{project.studentEmail || "غير محدد"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">القسم:</span>
            <span className="font-medium">
              {project.department === "cs"
                ? "علوم الحاسب"
                : project.department === "it"
                  ? "تقنية المعلومات"
                  : project.department === "is"
                    ? "نظم المعلومات"
                    : "غير محدد"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">خيار المشروع:</span>
            <span className="font-medium">{project.type === "one-course" ? "كورس واحد" : "كورسين"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تاريخ التقديم:</span>
            <span className="font-medium">
              {project.submittedAt
                ? new Date(project.submittedAt.seconds * 1000).toLocaleDateString("ar-EG")
                : "غير محدد"}
            </span>
          </div>
        </div>

        {project.status === "pending" && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent rounded-lg"
              onClick={() => {
                setSelectedProject(project)
                setIsViewDialogOpen(true)
              }}
            >
              <Eye className="w-4 h-4 ml-2" />
              عرض التفاصيل
            </Button>
            <Button
              size="sm"
              onClick={() => handleApproveClick(project)}
              className="flex-1 rounded-lg"
              disabled={isApproving}
            >
              <CheckCircle2 className="w-4 h-4 ml-2" />
              قبول
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 rounded-lg"
              onClick={() => {
                setSelectedProject(project)
                setIsRejectDialogOpen(true)
              }}
            >
              <XCircle className="w-4 h-4 ml-2" />
              رفض
            </Button>
          </div>
        )}

        {project.status === "rejected" && project.rejectionReason && (
          <div className="pt-4 border-t">
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">سبب الرفض:</p>
                <p className="text-sm text-muted-foreground mt-1">{project.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout sidebarItems={coordinatorSidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
            قبول ورفض أفكار المشاريع
          </h1>
          <p className="text-muted-foreground mt-2">مراجعة أفكار المشاريع المقترحة من الطلاب واتخاذ القرار المناسب</p>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-2 border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/50 to-background dark:from-amber-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    قيد المراجعة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">{pendingProjects.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة بانتظار القرار</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    المقبولة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">{approvedProjects.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة تم قبولها</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-red-200 dark:border-red-900 bg-gradient-to-br from-red-50/50 to-background dark:from-red-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    المرفوضة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-red-600 dark:text-red-400">{rejectedProjects.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة تم رفضها</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="pending" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending" className="gap-2">
                  <AlertCircle className="w-4 h-4" />
                  قيد المراجعة ({pendingProjects.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  المقبولة ({approvedProjects.length})
                </TabsTrigger>
                <TabsTrigger value="rejected" className="gap-2">
                  <XCircle className="w-4 h-4" />
                  المرفوضة ({rejectedProjects.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-6">
                {pendingProjects.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Lightbulb className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">لا توجد أفكار قيد المراجعة</h3>
                      <p className="text-sm text-muted-foreground">جميع أفكار المشاريع تم مراجعتها</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {pendingProjects.map((project, index) => (
                      <div
                        key={project.id}
                        className="animate-in fade-in slide-in-from-bottom duration-500"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <ProjectCard project={project} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="approved" className="mt-6">
                {approvedProjects.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <CheckCircle2 className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">لا توجد أفكار مقبولة</h3>
                      <p className="text-sm text-muted-foreground">لم يتم قبول أي فكرة بعد</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {approvedProjects.map((project, index) => (
                      <div
                        key={project.id}
                        className="animate-in fade-in slide-in-from-bottom duration-500"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <ProjectCard project={project} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rejected" className="mt-6">
                {rejectedProjects.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <XCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
                      <h3 className="text-xl font-semibold mb-2">لا توجد أفكار مرفوضة</h3>
                      <p className="text-sm text-muted-foreground">لم يتم رفض أي فكرة</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {rejectedProjects.map((project, index) => (
                      <div
                        key={project.id}
                        className="animate-in fade-in slide-in-from-bottom duration-500"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <ProjectCard project={project} />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              {selectedProject?.title}
            </DialogTitle>
            <DialogDescription>تفاصيل فكرة المشروع المقترحة</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 text-lg">الوصف:</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedProject?.description}</p>
            </div>

            {selectedProject?.objectives && selectedProject.objectives.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-lg">الأهداف:</h4>
                <ul className="space-y-2">
                  {selectedProject.objectives.map((objective: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm text-muted-foreground">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedProject?.technologies && selectedProject.technologies.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-lg">التقنيات المستخدمة:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProject.technologies.map((tech: string, index: number) => (
                    <Badge key={index} variant="secondary" className="rounded-lg">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">الطالب</p>
                <p className="font-semibold">{selectedProject?.studentName || "غير محدد"}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedProject?.studentEmail}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">القسم</p>
                <p className="font-semibold">
                  {selectedProject?.department === "cs"
                    ? "علوم الحاسب"
                    : selectedProject?.department === "it"
                      ? "تقنية المعلومات"
                      : selectedProject?.department === "is"
                        ? "نظم المعلومات"
                        : "غير محدد"}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">خيار المشروع</p>
                <p className="font-semibold">{selectedProject?.type === "one-course" ? "كورس واحد" : "كورسين"}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">تاريخ التقديم</p>
                <p className="font-semibold">
                  {selectedProject?.submittedAt
                    ? new Date(selectedProject.submittedAt.seconds * 1000).toLocaleDateString("ar-EG")
                    : "غير محدد"}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              onClick={() => {
                setIsViewDialogOpen(false)
                handleApproveClick(selectedProject)
              }}
              className="flex-1 rounded-lg"
              disabled={isApproving}
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 ml-2" />
              )}
              قبول الفكرة
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsViewDialogOpen(false)
                setIsRejectDialogOpen(true)
              }}
              className="flex-1 rounded-lg"
            >
              <XCircle className="w-4 h-4 ml-2" />
              رفض الفكرة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateProjectDialogOpen} onOpenChange={setIsCreateProjectDialogOpen}>
        <DialogContent className="max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إنشاء المشروع</DialogTitle>
            <DialogDescription>تم قبول الفكرة، الآن قم بتعيين المشرف وتحديد تواريخ المشروع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">عنوان المشروع: </span>
                <span className="font-semibold">{selectedProject?.title}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">الطالب: </span>
                <span className="font-semibold">{selectedProject?.studentName}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">القسم: </span>
                <span className="font-semibold">
                  {selectedProject?.department === "cs"
                    ? "علوم الحاسب"
                    : selectedProject?.department === "it"
                      ? "تقنية المعلومات"
                      : selectedProject?.department === "is"
                        ? "نظم المعلومات"
                        : "غير محدد"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervisor">المشرف *</Label>
              <Select
                value={newProject.supervisorId}
                onValueChange={(value) => setNewProject({ ...newProject, supervisorId: value })}
              >
                <SelectTrigger id="supervisor" className="rounded-lg">
                  <SelectValue placeholder="اختر المشرف" />
                </SelectTrigger>
                <SelectContent>
                  {supervisors.map((supervisor) => (
                    <SelectItem key={supervisor.id} value={supervisor.id}>
                      {supervisor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">تاريخ البدء *</Label>
              <Input
                id="startDate"
                type="date"
                value={newProject.startDate}
                onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                className="rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">تاريخ الانتهاء المتوقع</Label>
              <Input
                id="endDate"
                type="date"
                value={newProject.endDate}
                onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateProjectDialogOpen(false)}
              disabled={isApproving}
              className="rounded-lg"
            >
              إلغاء
            </Button>
            <Button onClick={handleCreateProject} disabled={isApproving} className="rounded-lg">
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                  إنشاء المشروع
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              رفض فكرة المشروع
            </DialogTitle>
            <DialogDescription>يرجى توضيح سبب رفض فكرة المشروع</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">المشروع</p>
              <p className="font-semibold">{selectedProject?.title}</p>
              <p className="text-sm text-muted-foreground mt-1">الطالب: {selectedProject?.studentName}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">سبب الرفض *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="rounded-lg"
                placeholder="اكتب سبب رفض فكرة المشروع..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} className="rounded-lg">
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleReject} className="rounded-lg" disabled={isRejecting}>
              {isRejecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
              تأكيد الرفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
