"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, Users, FileText, Archive, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/coordinator/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "جميع المشاريع", href: "/coordinator/projects", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المشرفين", href: "/coordinator/supervisors", icon: <Users className="w-5 h-5" /> },
  { title: "التقارير", href: "/coordinator/reports", icon: <FileText className="w-5 h-5" /> },
  { title: "الأرشيف", href: "/coordinator/archive", icon: <Archive className="w-5 h-5" /> },
]

export default function CoordinatorReports() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    pendingProjects: 0,
    totalSupervisors: 0,
    totalStudents: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch projects
        const projectsSnapshot = await getDocs(collection(db, "projects"))
        const projects = projectsSnapshot.docs.map((doc) => doc.data())

        // Fetch supervisors
        const supervisorsQuery = query(collection(db, "users"), where("role", "==", "supervisor"))
        const supervisorsSnapshot = await getDocs(supervisorsQuery)

        // Fetch students
        const studentsQuery = query(collection(db, "users"), where("role", "==", "student"))
        const studentsSnapshot = await getDocs(studentsQuery)

        setStats({
          totalProjects: projects.length,
          activeProjects: projects.filter((p) => p.status === "active").length,
          completedProjects: projects.filter((p) => p.status === "completed").length,
          pendingProjects: projects.filter((p) => p.status === "pending").length,
          totalSupervisors: supervisorsSnapshot.size,
          totalStudents: studentsSnapshot.size,
        })
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const generateReport = () => {
    const reportData = `
تقرير مشاريع التخرج
=====================

إحصائيات عامة:
- إجمالي المشاريع: ${stats.totalProjects}
- المشاريع النشطة: ${stats.activeProjects}
- المشاريع المكتملة: ${stats.completedProjects}
- المشاريع المعلقة: ${stats.pendingProjects}
- عدد المشرفين: ${stats.totalSupervisors}
- عدد الطلاب: ${stats.totalStudents}

تاريخ التقرير: ${new Date().toLocaleDateString("ar-SA")}
    `

    const blob = new Blob([reportData], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `تقرير-مشاريع-التخرج-${new Date().toISOString().split("T")[0]}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">التقارير</h1>
            <p className="text-muted-foreground mt-2">إحصائيات وتقارير الأداء</p>
          </div>
          <Button onClick={generateReport}>
            <Download className="w-4 h-4 ml-2" />
            تحميل التقرير
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المشاريع</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalProjects}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">المشاريع النشطة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{stats.activeProjects}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">المشاريع المكتملة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-blue-600">{stats.completedProjects}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">المشاريع المعلقة</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">{stats.pendingProjects}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">عدد المشرفين</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalSupervisors}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">عدد الطلاب</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stats.totalStudents}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>معلومات التقرير</CardTitle>
            <CardDescription>تفاصيل إضافية حول المشاريع</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">معدل الإنجاز</p>
                <p className="text-sm text-muted-foreground">نسبة المشاريع المكتملة من الإجمالي</p>
              </div>
              <p className="text-2xl font-bold">
                {stats.totalProjects > 0 ? Math.round((stats.completedProjects / stats.totalProjects) * 100) : 0}%
              </p>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">متوسط المشاريع لكل مشرف</p>
                <p className="text-sm text-muted-foreground">عدد المشاريع المخصصة لكل مشرف</p>
              </div>
              <p className="text-2xl font-bold">
                {stats.totalSupervisors > 0 ? (stats.totalProjects / stats.totalSupervisors).toFixed(1) : 0}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
