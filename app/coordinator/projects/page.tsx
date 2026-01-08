"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { FolderKanban, Check, X, Eye, Plus, Edit, Trash2, Pause, ArchiveIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { collection, getDocs, doc, updateDoc, addDoc, Timestamp, query, where, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { coordinatorSidebarItems } from "@/lib/constants/coordinator-sidebar"
import { useSearchParams } from "next/navigation"

export default function CoordinatorProjects() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<any>(null)
  const [supervisors, setSupervisors] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    supervisorId: "",
    studentId: "",
    department: "",
    startDate: "",
    endDate: "",
  })

  const searchParams = useSearchParams()
  const createFromIdeaId = searchParams.get("createFrom")

  const fetchProjects = async () => {
    try {
      const projectsSnapshot = await getDocs(collection(db, "projects"))
      const projectsData = projectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setProjects(projectsData)
    } catch (error) {
      console.error("Error fetching projects:", error)
      toast.error("حدث خطأ في تحميل المشاريع")
    } finally {
      setLoading(false)
    }
  }

  const fetchSupervisorsAndStudents = async () => {
    try {
      const supervisorsQuery = query(collection(db, "users"), where("role", "==", "supervisor"))
      const supervisorsSnapshot = await getDocs(supervisorsQuery)
      setSupervisors(supervisorsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))

      const studentsQuery = query(collection(db, "users"), where("role", "==", "student"))
      const studentsSnapshot = await getDocs(studentsQuery)
      setStudents(studentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }

  useEffect(() => {
    const loadApprovedIdea = async () => {
      if (createFromIdeaId) {
        try {
          const ideaDoc = await getDoc(doc(db, "projectIdeas", createFromIdeaId))
          if (ideaDoc.exists()) {
            const ideaData = ideaDoc.data()
            setNewProject({
              title: ideaData.title || "",
              description: ideaData.description || "",
              supervisorId: "",
              studentId: ideaData.studentId || "",
              department: ideaData.department || "",
              startDate: "",
              endDate: "",
            })
            setIsAddDialogOpen(true)
            toast.info("تم تحميل بيانات الفكرة المقبولة، يرجى اختيار المشرف")
          }
        } catch (error) {
          console.error("Error loading approved idea:", error)
          toast.error("حدث خطأ في تحميل بيانات الفكرة")
        }
      }
    }

    fetchProjects()
    fetchSupervisorsAndStudents()
    loadApprovedIdea()
  }, [createFromIdeaId])

  const handleAddProject = async () => {
    if (
      !newProject.title ||
      !newProject.description ||
      !newProject.supervisorId ||
      !newProject.department ||
      !newProject.startDate
    ) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      const supervisor = supervisors.find((s) => s.id === newProject.supervisorId)
      const student = students.find((s) => s.id === newProject.studentId)

      const projectData: any = {
        title: newProject.title,
        description: newProject.description,
        supervisorId: newProject.supervisorId,
        supervisorName: supervisor?.name || "",
        studentId: newProject.studentId || null,
        studentName: student?.name || "",
        department: newProject.department,
        status: "active",
        progress: 0,
        createdAt: Timestamp.now(),
        startDate: Timestamp.fromDate(new Date(newProject.startDate)),
      }

      if (newProject.endDate) {
        projectData.endDate = Timestamp.fromDate(new Date(newProject.endDate))
      }

      const projectRef = await addDoc(collection(db, "projects"), projectData)

      if (newProject.studentId) {
        await updateDoc(doc(db, "users", newProject.studentId), {
          supervisorId: newProject.supervisorId,
          projectId: projectRef.id,
        })
      }

      if (createFromIdeaId) {
        await updateDoc(doc(db, "projectIdeas", createFromIdeaId), {
          supervisorId: newProject.supervisorId,
          projectId: projectRef.id,
        })
      }

      toast.success("تم إضافة المشروع بنجاح")
      setIsAddDialogOpen(false)
      setNewProject({
        title: "",
        description: "",
        supervisorId: "",
        studentId: "",
        department: "",
        startDate: "",
        endDate: "",
      })

      if (createFromIdeaId) {
        window.history.pushState({}, "", "/coordinator/projects")
      }

      fetchProjects()
    } catch (error) {
      console.error("Error adding project:", error)
      toast.error("حدث خطأ أثناء إضافة المشروع")
    }
  }

  const handleApproveProject = async (projectId: string) => {
    try {
      await updateDoc(doc(db, "projects", projectId), {
        status: "active",
        approvedAt: new Date(),
      })
      toast.success("تم قبول المشروع بنجاح")
      fetchProjects()
    } catch (error) {
      console.error("Error approving project:", error)
      toast.error("حدث خطأ في قبول المشروع")
    }
  }

  const handleRejectProject = async (projectId: string) => {
    try {
      await updateDoc(doc(db, "projects", projectId), {
        status: "rejected",
        rejectedAt: new Date(),
      })
      toast.success("تم رفض المشروع")
      fetchProjects()
    } catch (error) {
      console.error("Error rejecting project:", error)
      toast.error("حدث خطأ في رفض المشروع")
    }
  }

  const handleSuspendProject = async (projectId: string) => {
    try {
      await updateDoc(doc(db, "projects", projectId), {
        status: "suspended",
        suspendedAt: Timestamp.now(),
      })
      toast.success("تم تعليق المشروع")
      fetchProjects()
    } catch (error) {
      console.error("Error suspending project:", error)
      toast.error("حدث خطأ في تعليق المشروع")
    }
  }

  const handleArchiveProject = async (projectId: string) => {
    try {
      await updateDoc(doc(db, "projects", projectId), {
        status: "archived",
        archivedAt: Timestamp.now(),
      })
      toast.success("تم أرشفة المشروع")
      fetchProjects()
    } catch (error) {
      console.error("Error archiving project:", error)
      toast.error("حدث خطأ في أرشفة المشروع")
    }
  }

  const handleUpdateProject = async () => {
    if (!selectedProject || !selectedProject.title || !selectedProject.description) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      const supervisor = supervisors.find((s) => s.id === selectedProject.supervisorId)
      const student = students.find((s) => s.id === selectedProject.studentId)

      const updateData: any = {
        title: selectedProject.title,
        description: selectedProject.description,
        supervisorId: selectedProject.supervisorId,
        supervisorName: supervisor?.name || "",
        studentId: selectedProject.studentId || null,
        studentName: student?.name || "",
        department: selectedProject.department,
        updatedAt: Timestamp.now(),
      }

      if (selectedProject.startDate && typeof selectedProject.startDate === "string") {
        updateData.startDate = Timestamp.fromDate(new Date(selectedProject.startDate))
      }

      if (selectedProject.endDate) {
        if (typeof selectedProject.endDate === "string") {
          updateData.endDate = Timestamp.fromDate(new Date(selectedProject.endDate))
        }
      }

      await updateDoc(doc(db, "projects", selectedProject.id), updateData)

      if (selectedProject.studentId) {
        await updateDoc(doc(db, "users", selectedProject.studentId), {
          supervisorId: selectedProject.supervisorId,
          projectId: selectedProject.id,
        })
      }

      toast.success("تم تحديث المشروع بنجاح")
      setIsEditDialogOpen(false)
      setSelectedProject(null)
      fetchProjects()
    } catch (error) {
      console.error("Error updating project:", error)
      toast.error("حدث خطأ أثناء تحديث المشروع")
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    try {
      const projectRef = doc(db, "projects", projectToDelete.id)
      await updateDoc(projectRef, {
        status: "deleted",
        deletedAt: Timestamp.now(),
      })

      toast.success("تم حذف المشروع")
      setIsDeleteDialogOpen(false)
      setProjectToDelete(null)
      fetchProjects()
    } catch (error) {
      console.error("Error deleting project:", error)
      toast.error("حدث خطأ في حذف المشروع")
    }
  }

  const activeProjects = projects.filter((project) => project.status === "active")
  const completedProjects = projects.filter((project) => project.status === "completed")
  const pendingProjects = projects.filter((project) => project.status === "pending")
  const rejectedProjects = projects.filter((project) => project.status === "rejected")
  const suspendedProjects = projects.filter((project) => project.status === "suspended")
  const archivedProjects = projects.filter((project) => project.status === "archived")

  const ProjectCard = ({ project }: { project: any }) => (
    <Card className="rounded-xl">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{project.title}</CardTitle>
            <CardDescription className="mt-2 line-clamp-2">{project.description}</CardDescription>
          </div>
          <Badge
            variant={
              project.status === "active"
                ? "default"
                : project.status === "completed"
                  ? "secondary"
                  : project.status === "rejected"
                    ? "destructive"
                    : project.status === "suspended"
                      ? "outline"
                      : project.status === "archived"
                        ? "secondary"
                        : "outline"
            }
            className="rounded-lg"
          >
            {project.status === "active"
              ? "نشط"
              : project.status === "completed"
                ? "مكتمل"
                : project.status === "rejected"
                  ? "مرفوض"
                  : project.status === "suspended"
                    ? "معلق"
                    : project.status === "archived"
                      ? "مؤرشف"
                      : "معلق"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">التقدم</span>
            <span className="text-sm text-muted-foreground">{project.progress || 0}%</span>
          </div>
          <Progress value={project.progress || 0} />
        </div>

        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تاريخ البدء:</span>
            <span>
              {project.startDate ? new Date(project.startDate.seconds * 1000).toLocaleDateString("ar-EG") : "غير محدد"}
            </span>
          </div>
          {project.endDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">تاريخ الانتهاء:</span>
              <span>{new Date(project.endDate.seconds * 1000).toLocaleDateString("ar-EG")}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المشرف:</span>
            <span>{project.supervisorName || "غير معين"}</span>
          </div>
          {project.studentName && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الطالب:</span>
              <span>{project.studentName}</span>
            </div>
          )}
        </div>

        {project.status === "pending" && (
          <div className="flex gap-2 pt-4 border-t">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-transparent rounded-lg"
                  onClick={() => setSelectedProject(project)}
                >
                  <Eye className="w-4 h-4 ml-2" />
                  عرض التفاصيل
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl rounded-xl">
                <DialogHeader>
                  <DialogTitle>{selectedProject?.title}</DialogTitle>
                  <DialogDescription>تفاصيل المشروع المقترح</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">الوصف:</h4>
                    <p className="text-sm text-muted-foreground">{selectedProject?.description}</p>
                  </div>
                  {selectedProject?.objectives && (
                    <div>
                      <h4 className="font-semibold mb-2">الأهداف:</h4>
                      <p className="text-sm text-muted-foreground">{selectedProject.objectives}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => handleApproveProject(selectedProject?.id)} className="flex-1 rounded-lg">
                      <Check className="w-4 h-4 ml-2" />
                      قبول المشروع
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleRejectProject(selectedProject?.id)}
                      className="flex-1 rounded-lg"
                    >
                      <X className="w-4 h-4 ml-2" />
                      رفض المشروع
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={() => handleApproveProject(project.id)} className="flex-1 rounded-lg">
              <Check className="w-4 h-4 ml-2" />
              قبول
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-lg"
              onClick={() => handleRejectProject(project.id)}
            >
              <X className="w-4 h-4 ml-2" />
              رفض
            </Button>
          </div>
        )}

        {(project.status === "active" || project.status === "suspended") && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg bg-transparent"
              onClick={() => {
                setSelectedProject(project)
                setIsEditDialogOpen(true)
              }}
            >
              <Edit className="w-4 h-4 ml-2" />
              تعديل
            </Button>
            {project.status === "active" && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-lg bg-transparent"
                onClick={() => handleSuspendProject(project.id)}
              >
                <Pause className="w-4 h-4 ml-2" />
                تعليق
              </Button>
            )}
            {project.status === "suspended" && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-lg bg-transparent"
                onClick={() => handleApproveProject(project.id)}
              >
                <Check className="w-4 h-4 ml-2" />
                تفعيل
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="flex-1 rounded-lg bg-transparent"
              onClick={() => handleArchiveProject(project.id)}
            >
              <ArchiveIcon className="w-4 h-4 ml-2" />
              أرشفة
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-lg"
              onClick={() => {
                setProjectToDelete(project)
                setIsDeleteDialogOpen(true)
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout sidebarItems={coordinatorSidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">جميع المشاريع</h1>
            <p className="text-muted-foreground mt-2">إدارة ومتابعة جميع مشاريع التخرج</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg">
                <Plus className="w-4 h-4 ml-2" />
                إضافة مشروع
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>إضافة مشروع جديد</DialogTitle>
                <DialogDescription>أدخل بيانات المشروع وقم بتعيين المشرف والطالب</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">عنوان المشروع *</Label>
                  <Input
                    id="title"
                    value={newProject.title}
                    onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                    placeholder="أدخل عنوان المشروع"
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">وصف المشروع *</Label>
                  <Textarea
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="أدخل وصف المشروع"
                    rows={4}
                    className="rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">تاريخ بداية المشروع *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">تاريخ انتهاء المشروع (اختياري)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                      className="rounded-lg"
                      min={newProject.startDate}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supervisor">المشرف *</Label>
                    <Select
                      value={newProject.supervisorId}
                      onValueChange={(value) => setNewProject({ ...newProject, supervisorId: value })}
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="اختر المشرف" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {supervisors.map((supervisor) => (
                          <SelectItem key={supervisor.id} value={supervisor.id}>
                            {supervisor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="student">الطالب (اختياري)</Label>
                    <Select
                      value={newProject.studentId}
                      onValueChange={(value) => setNewProject({ ...newProject, studentId: value })}
                    >
                      <SelectTrigger className="rounded-lg">
                        <SelectValue placeholder="اختر الطالب" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="none">بدون طالب</SelectItem>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">القسم *</Label>
                  <Select
                    value={newProject.department}
                    onValueChange={(value) => setNewProject({ ...newProject, department: value })}
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-lg">
                  إلغاء
                </Button>
                <Button onClick={handleAddProject} className="rounded-lg">
                  إضافة المشروع
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card className="rounded-xl">
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <FolderKanban className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">لا توجد مشاريع حالياً</h3>
                  <p className="text-sm text-muted-foreground mt-2">ابدأ بإضافة مشاريع جديدة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="rounded-lg">
              <TabsTrigger value="all" className="rounded-lg">
                الكل ({projects.length})
              </TabsTrigger>
              <TabsTrigger value="pending" className="rounded-lg">
                معلقة ({pendingProjects.length})
                {pendingProjects.length > 0 && (
                  <Badge variant="destructive" className="mr-2 h-5 w-5 rounded-full p-0 text-xs">
                    {pendingProjects.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-lg">
                نشطة ({activeProjects.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-lg">
                مكتملة ({completedProjects.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="rounded-lg">
                مرفوضة ({rejectedProjects.length})
              </TabsTrigger>
              <TabsTrigger value="suspended" className="rounded-lg">
                معلقة ({suspendedProjects.length})
              </TabsTrigger>
              <TabsTrigger value="archived" className="rounded-lg">
                مؤرشفة ({archivedProjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="grid gap-6 md:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </TabsContent>

            <TabsContent value="pending" className="grid gap-6 md:grid-cols-2">
              {pendingProjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 col-span-2">لا توجد مشاريع معلقة</p>
              ) : (
                pendingProjects.map((project) => <ProjectCard key={project.id} project={project} />)
              )}
            </TabsContent>

            <TabsContent value="active" className="grid gap-6 md:grid-cols-2">
              {activeProjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 col-span-2">لا توجد مشاريع نشطة</p>
              ) : (
                activeProjects.map((project) => <ProjectCard key={project.id} project={project} />)
              )}
            </TabsContent>

            <TabsContent value="completed" className="grid gap-6 md:grid-cols-2">
              {completedProjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 col-span-2">لا توجد مشاريع مكتملة</p>
              ) : (
                completedProjects.map((project) => <ProjectCard key={project.id} project={project} />)
              )}
            </TabsContent>

            <TabsContent value="rejected" className="grid gap-6 md:grid-cols-2">
              {rejectedProjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 col-span-2">لا توجد مشاريع مرفوضة</p>
              ) : (
                rejectedProjects.map((project) => <ProjectCard key={project.id} project={project} />)
              )}
            </TabsContent>

            <TabsContent value="suspended" className="grid gap-6 md:grid-cols-2">
              {suspendedProjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 col-span-2">لا توجد مشاريع معلقة</p>
              ) : (
                suspendedProjects.map((project) => <ProjectCard key={project.id} project={project} />)
              )}
            </TabsContent>

            <TabsContent value="archived" className="grid gap-6 md:grid-cols-2">
              {archivedProjects.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 col-span-2">لا توجد مشاريع مؤرشفة</p>
              ) : (
                archivedProjects.map((project) => <ProjectCard key={project.id} project={project} />)
              )}
            </TabsContent>
          </Tabs>
        )}

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تعديل المشروع</DialogTitle>
              <DialogDescription>قم بتحديث بيانات المشروع</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">عنوان المشروع *</Label>
                <Input
                  id="edit-title"
                  value={selectedProject?.title || ""}
                  onChange={(e) => setSelectedProject({ ...selectedProject, title: e.target.value })}
                  placeholder="أدخل عنوان المشروع"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">وصف المشروع *</Label>
                <Textarea
                  id="edit-description"
                  value={selectedProject?.description || ""}
                  onChange={(e) => setSelectedProject({ ...selectedProject, description: e.target.value })}
                  placeholder="أدخل وصف المشروع"
                  rows={4}
                  className="rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">تاريخ بداية المشروع</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={
                      selectedProject?.startDate
                        ? typeof selectedProject.startDate === "string"
                          ? selectedProject.startDate
                          : new Date(selectedProject.startDate.seconds * 1000).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => setSelectedProject({ ...selectedProject, startDate: e.target.value })}
                    className="rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">تاريخ انتهاء المشروع</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={
                      selectedProject?.endDate
                        ? typeof selectedProject.endDate === "string"
                          ? selectedProject.endDate
                          : new Date(selectedProject.endDate.seconds * 1000).toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => setSelectedProject({ ...selectedProject, endDate: e.target.value })}
                    className="rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-supervisor">المشرف *</Label>
                  <Select
                    value={selectedProject?.supervisorId || ""}
                    onValueChange={(value) => setSelectedProject({ ...selectedProject, supervisorId: value })}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="اختر المشرف" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {supervisors.map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-student">الطالب (اختياري)</Label>
                  <Select
                    value={selectedProject?.studentId || "none"}
                    onValueChange={(value) => setSelectedProject({ ...selectedProject, studentId: value })}
                  >
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="اختر الطالب" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="none">بدون طالب</SelectItem>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department">القسم *</Label>
                <Select
                  value={selectedProject?.department || ""}
                  onValueChange={(value) => setSelectedProject({ ...selectedProject, department: value })}
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="rounded-lg">
                إلغاء
              </Button>
              <Button onClick={handleUpdateProject} className="rounded-lg">
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle>تأكيد الحذف</DialogTitle>
              <DialogDescription>
                هل أنت متأكد من حذف المشروع "{projectToDelete?.title}"؟ هذا الإجراء لا يمكن التراجع عنه.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="rounded-lg">
                إلغاء
              </Button>
              <Button variant="destructive" onClick={handleDeleteProject} className="rounded-lg">
                حذف المشروع
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
