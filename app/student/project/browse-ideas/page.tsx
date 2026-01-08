"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { studentSidebarItems } from "@/lib/constants/student-sidebar"
import { Lightbulb, Eye, Check } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { collection, getDocs, query, where, updateDoc, doc, Timestamp } from "firebase/firestore"
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
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export default function BrowseProjectIdeas() {
  const [availableIdeas, setAvailableIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdea, setSelectedIdea] = useState<any>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isSelecting, setIsSelecting] = useState(false)
  const [canBrowse, setCanBrowse] = useState(true)
  const { userData } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const checkEligibility = async () => {
      if (!userData?.uid) return

      try {
        // Check if student already has a project
        if (userData.projectId) {
          setCanBrowse(false)
          toast.error("لديك مشروع مسند بالفعل")
          router.push("/student/project")
          return
        }

        // Check if student has pending or approved ideas
        const ideasQuery = query(collection(db, "projectIdeas"), where("studentId", "==", userData.uid))
        const ideasSnapshot = await getDocs(ideasQuery)
        const ideas = ideasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

        const hasPendingOrApproved = ideas.some((idea: any) => idea.status === "pending" || idea.status === "approved")

        if (hasPendingOrApproved) {
          setCanBrowse(false)
        }
      } catch (error) {
        console.error("Error checking eligibility:", error)
      }
    }

    checkEligibility()
  }, [userData, router])

  const fetchAvailableIdeas = async () => {
    try {
      setLoading(true)
      const ideasQuery = query(collection(db, "projectIdeas"), where("status", "==", "available"))
      const ideasSnapshot = await getDocs(ideasQuery)
      const ideasData = ideasSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
      setAvailableIdeas(ideasData)
    } catch (error) {
      console.error("Error fetching available ideas:", error)
      toast.error("حدث خطأ في تحميل أفكار المشاريع")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canBrowse) {
      fetchAvailableIdeas()
    }
  }, [canBrowse])

  const handleSelectIdea = async () => {
    if (!selectedIdea || !userData) return

    try {
      setIsSelecting(true)

      // Update the project idea with student selection
      await updateDoc(doc(db, "projectIdeas", selectedIdea.id), {
        studentId: userData.uid,
        studentName: userData.name,
        studentEmail: userData.email,
        selectedAt: Timestamp.now(),
        status: "pending",
      })

      toast.success("تم اختيار فكرة المشروع! سيتم إرسالها للمنسق للمراجعة")
      router.push("/student/project")
    } catch (error) {
      console.error("Error selecting project idea:", error)
      toast.error("حدث خطأ أثناء اختيار فكرة المشروع")
    } finally {
      setIsSelecting(false)
      setIsViewDialogOpen(false)
    }
  }

  const IdeaCard = ({ idea }: { idea: any }) => (
    <Card className="rounded-xl hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              {idea.title}
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2">{idea.description}</CardDescription>
          </div>
          <Badge variant="secondary" className="rounded-lg">
            متاح
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">المشرف:</span>
            <span className="font-medium">{idea.supervisorName || "غير محدد"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">القسم:</span>
            <span className="font-medium">
              {idea.department === "cs"
                ? "علوم الحاسب"
                : idea.department === "it"
                  ? "تقنية المعلومات"
                  : idea.department === "is"
                    ? "نظم المعلومات"
                    : "غير محدد"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">خيار المشروع:</span>
            <span className="font-medium">{idea.projectType === "one-course" ? "كورس واحد" : "كورسين"}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 bg-transparent rounded-lg"
            onClick={() => {
              setSelectedIdea(idea)
              setIsViewDialogOpen(true)
            }}
          >
            <Eye className="w-4 h-4 ml-2" />
            عرض التفاصيل
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (!canBrowse) {
    return (
      <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
        <div className="p-8 space-y-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لا يمكنك تصفح الأفكار المتاحة. لديك مشروع مسند بالفعل أو فكرة قيد المراجعة.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={studentSidebarItems} requiredRole="student">
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
        <div className="animate-in slide-in-from-top duration-700">
          <h1 className="text-4xl font-bold bg-gradient-to-l from-primary to-primary/60 bg-clip-text text-transparent">
            أفكار المشاريع المتاحة
          </h1>
          <p className="text-muted-foreground mt-2">تصفح واختر من أفكار المشاريع المطروحة من المشرفين</p>
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
            <div className="grid gap-6 md:grid-cols-1 max-w-md">
              <Card className="border-2 border-blue-200 dark:border-blue-900 bg-gradient-to-br from-blue-50/50 to-background dark:from-blue-950/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    الأفكار المتاحة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{availableIdeas.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">فكرة متاحة للاختيار</p>
                </CardContent>
              </Card>
            </div>

            {availableIdeas.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Lightbulb className="w-16 h-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">لا توجد أفكار متاحة حالياً</h3>
                  <p className="text-sm text-muted-foreground">لم يتم طرح أي أفكار من المشرفين بعد</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {availableIdeas.map((idea, index) => (
                  <div
                    key={idea.id}
                    className="animate-in fade-in slide-in-from-bottom duration-500"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <IdeaCard idea={idea} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl rounded-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-amber-500" />
              {selectedIdea?.title}
            </DialogTitle>
            <DialogDescription>تفاصيل فكرة المشروع المقترحة</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 text-lg">الوصف:</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedIdea?.description}</p>
            </div>

            {selectedIdea?.objectives && selectedIdea.objectives.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-lg">الأهداف:</h4>
                <ul className="space-y-2">
                  {selectedIdea.objectives.map((objective: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm text-muted-foreground">{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedIdea?.technologies && selectedIdea.technologies.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 text-lg">التقنيات المستخدمة:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedIdea.technologies.map((tech: string, index: number) => (
                    <Badge key={index} variant="secondary" className="rounded-lg">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">المشرف</p>
                <p className="font-semibold">{selectedIdea?.supervisorName || "غير محدد"}</p>
                <p className="text-xs text-muted-foreground mt-1">{selectedIdea?.supervisorEmail}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">القسم</p>
                <p className="font-semibold">
                  {selectedIdea?.department === "cs"
                    ? "علوم الحاسب"
                    : selectedIdea?.department === "it"
                      ? "تقنية المعلومات"
                      : selectedIdea?.department === "is"
                        ? "نظم المعلومات"
                        : "غير محدد"}
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">خيار المشروع</p>
                <p className="font-semibold">{selectedIdea?.projectType === "one-course" ? "كورس واحد" : "كورسين"}</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">تاريخ الطرح</p>
                <p className="font-semibold">
                  {selectedIdea?.submittedAt
                    ? new Date(selectedIdea.submittedAt.seconds * 1000).toLocaleDateString("ar-EG")
                    : "غير محدد"}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="rounded-lg">
              إلغاء
            </Button>
            <Button onClick={handleSelectIdea} disabled={isSelecting} className="rounded-lg">
              <Check className="w-4 h-4 ml-2" />
              {isSelecting ? "جاري الاختيار..." : "اختيار هذه الفكرة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
