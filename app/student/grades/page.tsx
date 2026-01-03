"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  Home,
  FolderKanban,
  CheckSquare,
  Calendar,
  FileText,
  Bell,
  User,
  Award,
  TrendingUp,
  MessageCircle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/lib/contexts/auth-context"
import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, query, where, getDocs, orderBy } from "firebase/firestore"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/student/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "الملف الشخصي", href: "/student/profile", icon: <User className="w-5 h-5" /> },
  { title: "مشروعي", href: "/student/project", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المهام", href: "/student/tasks", icon: <CheckSquare className="w-5 h-5" /> },
  { title: "الاجتماعات", href: "/student/meetings", icon: <Calendar className="w-5 h-5" /> },
  { title: "التقييمات", href: "/student/grades", icon: <Award className="w-5 h-5" /> },
  { title: "النقاشات", href: "/student/discussions", icon: <MessageCircle className="w-5 h-5" /> },
  { title: "الملفات", href: "/student/files", icon: <FileText className="w-5 h-5" /> },
  { title: "الإشعارات", href: "/student/notifications", icon: <Bell className="w-5 h-5" /> },
]

interface Grade {
  id: string
  studentId: string
  projectId: string
  category: string
  title: string
  score: number
  maxScore: number
  weight: number
  feedback: string
  gradedBy: string
  gradedByName: string
  gradedAt: any
}

export default function StudentGrades() {
  const { userData, loading: authLoading } = useAuth()
  const [grades, setGrades] = useState<Grade[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalScore: 0,
    maxTotalScore: 0,
    percentage: 0,
    gradedItems: 0,
    pendingItems: 0,
  })

  useEffect(() => {
    if (!authLoading && userData?.projectId) {
      fetchGrades()
    }
  }, [userData, authLoading])

  const fetchGrades = async () => {
    if (!userData?.projectId) return

    try {
      setLoading(true)
      const db = getFirebaseDb()

      const gradesQuery = query(
        collection(db, "grades"),
        where("studentId", "==", userData.uid),
        where("projectId", "==", userData.projectId),
        orderBy("gradedAt", "desc"),
      )

      const gradesSnapshot = await getDocs(gradesQuery)
      const gradesData = gradesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Grade[]

      setGrades(gradesData)

      // Calculate statistics
      const totalScore = gradesData.reduce((sum, grade) => sum + grade.score, 0)
      const maxTotalScore = gradesData.reduce((sum, grade) => sum + grade.maxScore, 0)
      const percentage = maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0

      setStats({
        totalScore,
        maxTotalScore,
        percentage: Math.round(percentage * 10) / 10,
        gradedItems: gradesData.length,
        pendingItems: 0, // This would come from assignments without grades
      })
    } catch (error) {
      console.error("[v0] Error fetching grades:", error)
      toast.error("حدث خطأ أثناء تحميل التقييمات")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "غير محدد"
    return timestamp.toDate().toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 dark:text-green-400"
    if (percentage >= 80) return "text-blue-600 dark:text-blue-400"
    if (percentage >= 70) return "text-yellow-600 dark:text-yellow-400"
    if (percentage >= 60) return "text-orange-600 dark:text-orange-400"
    return "text-red-600 dark:text-red-400"
  }

  const getGradeLetter = (percentage: number) => {
    if (percentage >= 90) return "A"
    if (percentage >= 80) return "B"
    if (percentage >= 70) return "C"
    if (percentage >= 60) return "D"
    return "F"
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "proposal":
        return <FileText className="w-5 h-5" />
      case "report":
        return <FileText className="w-5 h-5" />
      case "presentation":
        return <Award className="w-5 h-5" />
      case "progress":
        return <TrendingUp className="w-5 h-5" />
      default:
        return <Award className="w-5 h-5" />
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case "proposal":
        return "المقترح"
      case "report":
        return "التقرير"
      case "presentation":
        return "العرض التقديمي"
      case "progress":
        return "التقدم"
      default:
        return category
    }
  }

  if (!userData?.projectId) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Award className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">لا يوجد مشروع</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              يجب أن تكون مسجلاً في مشروع للوصول إلى التقييمات
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="student">
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Award className="w-8 h-8 text-primary" />
            </div>
            التقييمات
          </h1>
          <p className="text-muted-foreground mt-2">تابع درجاتك وتقييماتك في مراحل المشروع</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="text-sm font-medium">المجموع الكلي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${getGradeColor(stats.percentage)}`}>{stats.totalScore}</span>
                  <span className="text-2xl text-muted-foreground">/ {stats.maxTotalScore}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={stats.percentage} className="flex-1" />
                  <span className={`text-sm font-semibold ${getGradeColor(stats.percentage)}`}>
                    {stats.percentage}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {getGradeLetter(stats.percentage)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">العناصر المقيمة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">{stats.gradedItems}</div>
              <p className="text-sm text-muted-foreground mt-2">عنصر تم تقييمه</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">قيد الانتظار</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">{stats.pendingItems}</div>
              <p className="text-sm text-muted-foreground mt-2">عنصر قيد التقييم</p>
            </CardContent>
          </Card>
        </div>

        {/* Grades List */}
        <Card>
          <CardHeader>
            <CardTitle>تفاصيل التقييمات</CardTitle>
            <CardDescription>جميع التقييمات حسب المرحلة</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : grades.length === 0 ? (
              <div className="text-center py-12">
                <Award className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">لا توجد تقييمات بعد</h3>
                <p className="text-sm text-muted-foreground">سيتم عرض التقييمات هنا بمجرد أن يقوم المشرف بتقييم عملك</p>
              </div>
            ) : (
              <div className="space-y-4">
                {grades.map((grade, index) => {
                  const percentage = (grade.score / grade.maxScore) * 100
                  return (
                    <div
                      key={grade.id}
                      className="flex items-start gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors animate-in fade-in slide-in-from-bottom duration-500"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="p-3 bg-primary/10 rounded-lg">{getCategoryIcon(grade.category)}</div>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="font-semibold">{grade.title}</h4>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Badge variant="secondary">{getCategoryName(grade.category)}</Badge>
                              <span>•</span>
                              <span>تم التقييم بواسطة {grade.gradedByName}</span>
                              <span>•</span>
                              <span>{formatDate(grade.gradedAt)}</span>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="flex items-baseline gap-1">
                              <span className={`text-2xl font-bold ${getGradeColor(percentage)}`}>{grade.score}</span>
                              <span className="text-muted-foreground">/ {grade.maxScore}</span>
                            </div>
                            <div className={`text-sm font-semibold ${getGradeColor(percentage)}`}>
                              {Math.round(percentage)}%
                            </div>
                          </div>
                        </div>

                        {grade.feedback && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm font-medium mb-1">ملاحظات المشرف:</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{grade.feedback}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="flex-1 h-2" />
                          <Badge variant="outline">{getGradeLetter(percentage)}</Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
