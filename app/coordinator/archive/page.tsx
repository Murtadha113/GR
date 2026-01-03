"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Home, FolderKanban, Users, FileText, Archive, Download, Eye } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { collection, getDocs, query, where } from "firebase/firestore"
import { db } from "@/lib/firebase/config"
import { useAuth } from "@/lib/contexts/auth-context"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

const sidebarItems = [
  { title: "لوحة التحكم", href: "/coordinator/dashboard", icon: <Home className="w-5 h-5" /> },
  { title: "جميع المشاريع", href: "/coordinator/projects", icon: <FolderKanban className="w-5 h-5" /> },
  { title: "المشرفين", href: "/coordinator/supervisors", icon: <Users className="w-5 h-5" /> },
  { title: "التقارير", href: "/coordinator/reports", icon: <FileText className="w-5 h-5" /> },
  { title: "الأرشيف", href: "/coordinator/archive", icon: <Archive className="w-5 h-5" /> },
]

export default function CoordinatorArchive() {
  const { loading: authLoading } = useAuth()
  const [archivedProjects, setArchivedProjects] = useState<any[]>([])
  const [filteredProjects, setFilteredProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const fetchArchivedProjects = async () => {
      try {
        const projectsQuery = query(collection(db, "projects"), where("status", "==", "completed"))
        const projectsSnapshot = await getDocs(projectsQuery)
        const projectsData = projectsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        setArchivedProjects(projectsData)
        setFilteredProjects(projectsData)
      } catch (error) {
        console.error("Error fetching archived projects:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchArchivedProjects()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = archivedProjects.filter(
        (project) =>
          project.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          project.supervisorName?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredProjects(filtered)
    } else {
      setFilteredProjects(archivedProjects)
    }
  }, [searchTerm, archivedProjects])

  if (authLoading) {
    return (
      <DashboardLayout sidebarItems={sidebarItems} requiredRole="coordinator">
        <div className="p-8">
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout sidebarItems={sidebarItems} requiredRole="coordinator">
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">الأرشيف</h1>
          <p className="text-muted-foreground mt-2">المشاريع المكتملة والمؤرشفة</p>
        </div>

        {!loading && archivedProjects.length > 0 && (
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="البحث في المشاريع المؤرشفة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-8">
              <p className="text-center text-muted-foreground">جاري التحميل...</p>
            </CardContent>
          </Card>
        ) : filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <Archive className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">{searchTerm ? "لا توجد نتائج" : "لا توجد مشاريع مؤرشفة"}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {searchTerm ? "جرب البحث بكلمات مختلفة" : "سيتم عرض المشاريع المكتملة هنا"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredProjects.map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <CardDescription className="mt-2 line-clamp-2">{project.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">مكتمل</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">تاريخ الإكمال: </span>
                    <span>
                      {project.endDate
                        ? new Date(project.endDate.seconds * 1000).toLocaleDateString("ar-SA")
                        : "غير محدد"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">المشرف: </span>
                    <span>{project.supervisorName || "غير معين"}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      <Eye className="w-4 h-4 ml-2" />
                      عرض التفاصيل
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      <Download className="w-4 h-4 ml-2" />
                      تحميل الملفات
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
