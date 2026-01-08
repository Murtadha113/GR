"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { supervisorSidebarItems } from "@/lib/constants/supervisor-sidebar"
import { Lightbulb, Eye, AlertCircle, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { collection, getDocs, query, where, addDoc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SupervisorProjectIdeas() {
  const [projectIdeas, setProjectIdeas] = useState<any[]>([])
  const [proposedIdeas, setProposedIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { userData } = useAuth()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    objectives: "",
    technologies: "",
    projectType: "",
    department: "",
  })

  const fetchProjectIdeas = async () => {
    try {
      setLoading(true)
      const ideasQuery = query(
        collection(db, "projectIdeas"),
        where("supervisorId", "==", userData?.uid),
        where("status", "==", "approved"),
      )
      const ideasSnapshot = await getDocs(ideasQuery)
      const ideasData = ideasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setProjectIdeas(ideasData)

      const proposedQuery = query(collection(db, "projectIdeas"), where("proposedBySupervisor", "==", userData?.uid))
      const proposedSnapshot = await getDocs(proposedQuery)
      const proposedData = proposedSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setProposedIdeas(proposedData)
    } catch (error) {
      console.error("Error fetching project ideas:", error)
      toast.error("حدث خطأ في تحميل أفكار المشاريع")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userData?.uid) {
      fetchProjectIdeas()
    }
  }, [userData])

  const handleSubmitIdea = async () => {
    if (
      !formData.title ||
      !formData.description ||
      !formData.objectives ||
      !formData.technologies ||
      !formData.projectType ||
      !formData.department
    ) {
      toast.error("يرجى ملء جميع الحقول المطلوبة")
      return
    }

    try {
      setIsSubmitting(true)
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
        proposedBySupervisor: userData?.uid,
        supervisorName: userData?.name,
        supervisorEmail: userData?.email,
        status: "available",
        submittedAt: Timestamp.now(),
      })

      toast.success("تم طرح فكرة المشروع بنجاح!")
      setIsAddDialogOpen(false)
      setFormData({
        title: "",
        description: "",
        objectives: "",
        technologies: "",
        projectType: "",
        department: "",
      })
      fetchProjectIdeas()
    } catch (error) {
      console.error("Error submitting project idea:", error)
      toast.error("حدث خطأ أثناء طرح فكرة المشروع")
    } finally {
      setIsSubmitting(false)
    }
  }

  const approvedProjects = projectIdeas.filter((project) => project.status === "approved")

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
              project.status === "pending"
                ? "outline"
                : project.status === "approved"
                  ? "default"
                  : project.status === "available"
                    ? "secondary"
                    : "destructive"
            }
            className="rounded-lg"
          >
            {project.status === "pending"
              ? "قيد المراجعة"
              : project.status === "approved"
                ? "مقبول"
                : project.status === "available"
                  ? "متاح للطلاب"
                  : "مرفوض"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          {project.studentName && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">الطالب:</span>
                <span className="font-medium">{project.studentName || "غير محدد"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">البريد الإلكتروني:</span>
                <span className="font-medium text-xs">{project.studentEmail || "غير محدد"}</span>
              </div>
            </>
          )}
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
            <span className="font-medium">{project.projectType === "one-course" ? "كورس واحد" : "كورسين"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تاريخ التقديم:</span>
            <span className="font-medium">
              {project.submittedAt
                ? new Date(project.submittedAt.seconds * 1000).toLocaleDateString("ar-EG")
                : "غير محدد"}
            </span>
          </div>
          {project.status === "available" && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">الحالة:</span>
              <span className="font-medium text-green-600">متاح للطلاب</span>
            </div>
          )}
          {project.selectedBy && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">اختارها:</span>
              <span className="font-medium">{project.selectedByName}</span>
            </div>
          )}
        </div>

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
        </div>

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
    <DashboardLayout sidebarItems={supervisorSidebarItems} requiredRole="supervisor">
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="animate-in slide-in-from-top duration-700 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
              أفكار المشاريع
            </h1>
            <p className="text-muted-foreground mt-2">عرض المشاريع المسندة وطرح أفكار جديدة للطلاب</p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="rounded-lg">
            <Plus className="w-4 h-4 ml-2" />
            طرح فكرة جديدة
          </Button>
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
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2 border-green-200 dark:border-green-900 bg-gradient-to-br from-green-50/50 to-background dark:from-green-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    المشاريع المسندة لي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-green-600 dark:text-green-400">{approvedProjects.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة مشروع</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    الأفكار المطروحة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{proposedIdeas.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة مطروحة للطلاب</p>
                </CardContent>
              </Card>
            </div>

            {proposedIdeas.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold mb-4">الأفكار المطروحة للطلاب</h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {proposedIdeas.map((project, index) => (
                    <div
                      key={project.id}
                      className="animate-in fade-in slide-in-from-bottom duration-500"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <ProjectCard project={project} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Existing assigned projects section */}
            <div>
              <h2 className="text-2xl font-bold mb-4">المشاريع المسندة إلي</h2>
              {approvedProjects.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <Lightbulb className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">لا توجد مشاريع مسندة</h3>
                    <p className="text-sm text-muted-foreground">لم يتم إسناد أي مشروع لك بعد</p>
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
            </div>
          </>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              طرح فكرة مشروع جديدة
            </DialogTitle>
            <DialogDescription>اطرح فكرة مشروع جديدة ليختارها الطلاب</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">عنوان المشروع *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="rounded-lg"
                placeholder="مثال: نظام إدارة المكتبات"
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
                placeholder="وصف تفصيلي لفكرة المشروع..."
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
                placeholder="اكتب كل هدف في سطر منفصل"
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
                placeholder="مثال: React, Node.js, MongoDB"
              />
              <p className="text-xs text-muted-foreground">افصل بين التقنيات بفاصلة</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-lg">
              إلغاء
            </Button>
            <Button onClick={handleSubmitIdea} disabled={isSubmitting} className="rounded-lg">
              {isSubmitting ? "جاري الإضافة..." : "طرح الفكرة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing view dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              {selectedProject?.title}
            </DialogTitle>
            <DialogDescription>تفاصيل فكرة المشروع</DialogDescription>
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
              {selectedProject?.studentName && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">الطالب</p>
                  <p className="font-semibold">{selectedProject?.studentName || "غير محدد"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedProject?.studentEmail}</p>
                </div>
              )}
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
                <p className="font-semibold">
                  {selectedProject?.projectType === "one-course" ? "كورس واحد" : "كورسين"}
                </p>
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

            {selectedProject?.status === "rejected" && selectedProject.rejectionReason && (
              <div className="p-4 bg-destructive/10 rounded-lg border-2 border-destructive/20">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive mb-2">سبب الرفض:</p>
                    <p className="text-sm text-muted-foreground">{selectedProject.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
